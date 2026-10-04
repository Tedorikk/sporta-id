<?php

namespace App\Services\Payments;

use App\Jobs\ProcessPaymentEffect;
use App\Models\Payment;
use App\Models\PaymentEffect;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * Applies verified payment outcomes to payments and payables.
 *
 * Enforces legal state transitions, prevents regression, and creates
 * durable side-effect records transactionally.
 */
class PaymentReconciler
{
    /**
     * Reconcile a payment with a verified outcome from a provider.
     */
    public function reconcile(Payment $payment, PaymentOutcome $outcome): void
    {
        DB::transaction(function () use ($payment, $outcome) {
            // Lock payment and payable for update
            $payment = $payment->newQuery()
                ->whereKey($payment->getKey())
                ->lockForUpdate()
                ->firstOrFail();
            $payable = $payment->payable()->lockForUpdate()->first();

            if (! $payable) {
                throw new \RuntimeException("Payment {$payment->id} has no payable");
            }

            Log::info('[Reconciler] Reconciling payment', [
                'payment_id' => $payment->id,
                'order_id' => $payment->order_id,
                'current_status' => $payment->status,
                'new_status' => $outcome->status,
            ]);

            // Check if transition is allowed
            if (! $this->isTransitionAllowed($payment, $outcome)) {
                Log::warning('[Reconciler] Transition not allowed', [
                    'payment_id' => $payment->id,
                    'current_status' => $payment->status,
                    'new_status' => $outcome->status,
                ]);

                return;
            }

            // Update payment with outcome
            $this->updatePayment($payment, $outcome);

            // Apply to payable and create effects if settlement
            if ($outcome->status === 'settlement') {
                $this->handleSettlement($payment, $payable, $outcome);
            } elseif (in_array($outcome->status, ['expire', 'cancel', 'deny', 'failure'])) {
                $this->handleFailureOrExpiry($payment, $payable, $outcome);
            }

            Log::info('[Reconciler] Payment reconciled', [
                'payment_id' => $payment->id,
                'status' => $payment->status,
                'fulfillment_state' => $payment->fulfillment_state,
            ]);
        });
    }

    /**
     * Check if status transition is legally allowed.
     */
    private function isTransitionAllowed(Payment $payment, PaymentOutcome $outcome): bool
    {
        $currentStatus = $payment->status;
        $newStatus = $outcome->status;

        // Same status - allowed (idempotent)
        if ($currentStatus === $newStatus) {
            return true;
        }

        // Terminal states cannot regress
        $terminalStates = [
            Payment::STATUS_SETTLEMENT,
            Payment::STATUS_REFUND,
        ];

        if (in_array($currentStatus, $terminalStates)) {
            Log::warning('[Reconciler] Cannot transition from terminal state', [
                'current' => $currentStatus,
                'new' => $newStatus,
            ]);

            return false;
        }

        // Allowed transitions from pending
        if ($currentStatus === Payment::STATUS_PENDING) {
            return in_array($newStatus, [
                Payment::STATUS_SETTLEMENT,
                Payment::STATUS_EXPIRE,
                Payment::STATUS_CANCEL,
                Payment::STATUS_FAILURE,
                Payment::STATUS_DENY,
            ]);
        }

        // Expired/canceled can become settled (late payment)
        if (in_array($currentStatus, [Payment::STATUS_EXPIRE, Payment::STATUS_CANCEL])) {
            return $newStatus === Payment::STATUS_SETTLEMENT;
        }

        return false;
    }

    /**
     * Update payment record with outcome data.
     */
    private function updatePayment(Payment $payment, PaymentOutcome $outcome): void
    {
        $updates = [
            'status' => $outcome->status,
            'provider_status' => $outcome->providerStatus,
            'provider_updated_at' => $outcome->providerUpdatedAt ?? now(),
            'last_reconciled_at' => now(),
        ];

        // Update session/payment IDs if provided
        if ($outcome->providerSessionId && ! $payment->provider_session_id) {
            $updates['provider_session_id'] = $outcome->providerSessionId;
            if ($outcome->provider === 'midtrans') {
                $updates['snap_token'] = $outcome->providerSessionId;
            }
        }

        if ($outcome->providerPaymentId) {
            $updates['provider_payment_id'] = $outcome->providerPaymentId;
            if ($outcome->provider === 'midtrans') {
                $updates['midtrans_transaction_id'] = $outcome->providerPaymentId;
            }
        }

        if ($outcome->providerRequestId) {
            $updates['provider_request_id'] = $outcome->providerRequestId;
        }

        // Set paid_at for settlements
        if ($outcome->status === 'settlement' && $outcome->paidAt) {
            $updates['paid_at'] = $outcome->paidAt;
        }

        // Update checkout state
        if (in_array($outcome->status, ['settlement', 'expire', 'cancel', 'deny', 'failure'])) {
            $updates['checkout_state'] = Payment::CHECKOUT_CLOSED;
        }

        $payment->update($updates);
    }

    /**
     * Handle settlement: check eligibility and create effects.
     */
    private function handleSettlement(Payment $payment, Payable $payable, PaymentOutcome $outcome): void
    {
        // Check if this is the first settlement for this payable
        $existingSettlement = $payment->payable
            ->payments()
            ->where('status', Payment::STATUS_SETTLEMENT)
            ->where('id', '!=', $payment->id)
            ->exists();

        if ($existingSettlement) {
            // Excess payment - flag for review
            $payment->update([
                'fulfillment_state' => Payment::FULFILLMENT_EXCESS_PAYMENT,
                'review_reason' => 'Multiple payments settled for same payable',
            ]);

            Log::warning('[Reconciler] Excess payment detected', [
                'payment_id' => $payment->id,
                'order_id' => $payment->order_id,
            ]);

            return;
        }

        // Apply payment status to payable
        $wasFirstSettlement = $payable->applyPaymentStatus($payment, $outcome->status);

        if ($wasFirstSettlement) {
            // Create fulfillment effects
            $this->createFulfillmentEffects($payment, $payable);

            $payment->update([
                'fulfillment_state' => Payment::FULFILLMENT_FULFILLED,
            ]);

            Log::info('[Reconciler] Settlement fulfilled', [
                'payment_id' => $payment->id,
                'payable_type' => get_class($payable),
                'payable_id' => $payable->getKey(),
            ]);
        } else {
            // Late payment after already settled/expired
            $payment->update([
                'fulfillment_state' => Payment::FULFILLMENT_LATE_PAYMENT,
                'review_reason' => 'Payment settled after payable already processed',
            ]);

            Log::warning('[Reconciler] Late payment detected', [
                'payment_id' => $payment->id,
                'order_id' => $payment->order_id,
            ]);
        }
    }

    /**
     * Handle expiry, cancellation, or failure.
     */
    private function handleFailureOrExpiry(Payment $payment, Payable $payable, PaymentOutcome $outcome): void
    {
        // Just mark checkout as closed
        // Payable handles its own expiry logic (separate from payment expiry)

        Log::info('[Reconciler] Payment failed or expired', [
            'payment_id' => $payment->id,
            'order_id' => $payment->order_id,
            'status' => $outcome->status,
        ]);
    }

    /**
     * Create durable side-effect records for fulfillment.
     */
    private function createFulfillmentEffects(Payment $payment, Payable $payable): void
    {
        $effects = [
            [
                'effect_type' => 'confirmation_email',
                'effect_key' => "{$payment->id}|confirmation_email|{$payable->getKey()}",
                'payload' => [
                    'payable_type' => get_class($payable),
                    'payable_id' => $payable->getKey(),
                    'payment_id' => $payment->id,
                ],
            ],
            // Additional effects can be added here based on payable type
            // e.g., quota_update, bib_assignment, vote_count
        ];

        foreach ($effects as $effectData) {
            // Check if effect already exists (idempotency)
            $existing = PaymentEffect::where('effect_key', $effectData['effect_key'])->first();

            if (! $existing) {
                $effect = PaymentEffect::create([
                    'payment_id' => $payment->id,
                    'payable_type' => get_class($payable),
                    'payable_id' => $payable->getKey(),
                    'effect_type' => $effectData['effect_type'],
                    'effect_key' => $effectData['effect_key'],
                    'payload' => $effectData['payload'],
                    'state' => 'pending',
                ]);

                // Dispatch job to process effect
                ProcessPaymentEffect::dispatch($effect)
                    ->onQueue(config('payments.webhook_queue', 'payments'));

                Log::info('[Reconciler] Effect created and dispatched', [
                    'payment_id' => $payment->id,
                    'effect_id' => $effect->id,
                    'effect_type' => $effectData['effect_type'],
                ]);
            } else {
                Log::info('[Reconciler] Effect already exists', [
                    'payment_id' => $payment->id,
                    'effect_key' => $effectData['effect_key'],
                ]);
            }
        }
    }
}
