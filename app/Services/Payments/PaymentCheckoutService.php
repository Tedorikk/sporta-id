<?php

namespace App\Services\Payments;

use App\Models\Payment;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use RuntimeException;

/**
 * Manages payment checkout creation with deduplication and concurrency control.
 *
 * Ensures only one checkout session is created per payable, reuses active sessions,
 * and handles concurrent requests with creation leases.
 */
class PaymentCheckoutService
{
    public function __construct(
        private readonly PaymentGatewayManager $gatewayManager,
    ) {}

    /**
     * Get or create a checkout session for a payable.
     *
     * @param  Payable  $payable  The item being purchased
     * @param  string  $successUrl  Where to redirect after payment
     * @param  string  $failureUrl  Where to redirect after cancel/failure
     * @return CheckoutResult Checkout URL and metadata, or error
     */
    public function getOrCreateCheckout(
        Payable $payable,
        string $successUrl,
        string $failureUrl
    ): CheckoutResult {
        // Check if checkout is globally disabled
        if (! config('payments.checkout_enabled', true)) {
            return CheckoutResult::unavailable();
        }

        // Hold the payable lock only while selecting an attempt and acquiring
        // its creation lease. Provider HTTP calls must happen after commit.
        $paymentOrResult = DB::transaction(function () use ($payable) {
            // Lock the payable to prevent concurrent checkout creation
            $payable = $this->lockPayable($payable);

            // Find existing payment attempt
            $payment = $this->findExistingPayment($payable);

            if ($payment) {
                // Check if we can reuse existing checkout
                if ($payment->hasActiveCheckout()) {
                    Log::info('[CheckoutService] Reusing active checkout', [
                        'payment_id' => $payment->id,
                        'order_id' => $payment->order_id,
                    ]);

                    return CheckoutResult::success(
                        checkoutUrl: $payment->checkout_url,
                        sessionId: $payment->provider_session_id,
                        expiresAt: $payment->checkout_expires_at,
                    );
                }

                // Check if another request is creating a session
                if ($this->hasActiveCreationLease($payment)) {
                    return CheckoutResult::preparing();
                }

                if ($payment->checkout_state === Payment::CHECKOUT_UNKNOWN) {
                    return CheckoutResult::error(
                        message: 'The previous checkout attempt has an unknown outcome and requires reconciliation.',
                        code: 'unknown_outcome',
                        canRetry: false,
                    );
                }
            }

            // Create new payment attempt if none exists or previous expired
            if (! $payment || $this->shouldCreateNewAttempt($payment)) {
                $payment = $this->createPaymentAttempt($payable);
            }

            // Acquire creation lease
            $this->acquireCreationLease($payment);

            return $payment;
        });

        if ($paymentOrResult instanceof CheckoutResult) {
            return $paymentOrResult;
        }

        // Perform remote checkout creation outside the transaction lock
        return $this->performCheckoutCreation($paymentOrResult, $payable, $successUrl, $failureUrl);
    }

    /**
     * Lock the payable for exclusive access.
     */
    private function lockPayable(Payable $payable): Payable
    {
        if (! $payable instanceof Model) {
            throw new RuntimeException('Payable implementations must be Eloquent models.');
        }

        /** @var Payable|null $lockedPayable */
        $lockedPayable = $payable->newQuery()
            ->whereKey($payable->getKey())
            ->lockForUpdate()
            ->first();

        if (! $lockedPayable instanceof Payable) {
            throw new RuntimeException('The payable no longer exists.');
        }

        return $lockedPayable;
    }

    /**
     * Find existing payment attempt for the payable.
     */
    private function findExistingPayment(Payable $payable): ?Payment
    {
        return $payable->payments()
            ->where('status', Payment::STATUS_PENDING)
            ->where(function ($query) {
                $query->whereIn('checkout_state', [
                    Payment::CHECKOUT_CREATING,
                    Payment::CHECKOUT_READY,
                    Payment::CHECKOUT_UNKNOWN,
                ])->orWhereNull('checkout_state');
            })
            ->latest()
            ->first();
    }

    /**
     * Check if payment has an active creation lease.
     */
    private function hasActiveCreationLease(Payment $payment): bool
    {
        return $payment->checkout_state === Payment::CHECKOUT_CREATING
            && $payment->creation_lease_expires_at?->isFuture();
    }

    /**
     * Determine if a new attempt should be created.
     */
    private function shouldCreateNewAttempt(Payment $payment): bool
    {
        // Create new attempt if previous is in terminal state
        if (in_array($payment->checkout_state, [Payment::CHECKOUT_FAILED, Payment::CHECKOUT_CLOSED], true)) {
            return true;
        }

        // Create new attempt if checkout expired
        if ($payment->checkout_state === Payment::CHECKOUT_READY
            && $payment->checkout_expires_at?->isPast()) {
            return true;
        }

        // Create new attempt if creation lease expired without resolution
        if ($payment->checkout_state === Payment::CHECKOUT_CREATING
            && $payment->creation_lease_expires_at?->isPast()) {
            return true;
        }

        return false;
    }

    /**
     * Create a new payment attempt record.
     */
    private function createPaymentAttempt(Payable $payable): Payment
    {
        $gateway = $this->gatewayManager->defaultGateway();
        $provider = $gateway->getProvider();
        $orderId = $this->generateOrderId();
        $previousPayment = $payable->payments()->latest('id')->first();
        $previousSnapshot = $previousPayment?->request_snapshot;
        $amount = isset($previousSnapshot['amount'])
            ? (int) $previousSnapshot['amount']
            : $payable->getPaymentAmount();

        Log::info('[CheckoutService] Creating new payment attempt', [
            'provider' => $provider,
            'order_id' => $orderId,
            'amount' => $amount,
        ]);

        $payment = $payable->payments()->make([
            'order_id' => $orderId,
            'amount' => $amount,
            'currency' => config('payments.currency', 'IDR'),
            'status' => Payment::STATUS_PENDING,
            'provider' => $provider,
            'provider_mode' => $provider === Payment::PROVIDER_XENDIT
                ? config('services.xendit.mode', 'test')
                : null,
            'checkout_state' => Payment::CHECKOUT_CREATING,
        ]);

        $payment->setRelation('payable', $payable);
        $payment->request_snapshot = is_array($previousSnapshot)
            ? $previousSnapshot
            : $this->createRequestSnapshot($payable, $payment);
        $payment->save();

        return $payment;
    }

    /**
     * Acquire creation lease to prevent concurrent creation.
     */
    private function acquireCreationLease(Payment $payment): void
    {
        $leaseMinutes = 5; // 5 minutes to complete creation

        $payment->update([
            'checkout_state' => Payment::CHECKOUT_CREATING,
            'creation_lease_expires_at' => now()->addMinutes($leaseMinutes),
        ]);
    }

    /**
     * Perform the actual checkout creation with the gateway.
     */
    private function performCheckoutCreation(
        Payment $payment,
        Payable $payable,
        string $successUrl,
        string $failureUrl
    ): CheckoutResult {
        $gateway = $this->gatewayManager->gateway($payment->provider);

        try {
            $result = $gateway->createCheckout($payment, $payable, $successUrl, $failureUrl);

            if ($result->success) {
                // Persist successful checkout
                $payment->update([
                    'provider_session_id' => $result->sessionId,
                    'checkout_url' => $result->checkoutUrl,
                    'checkout_expires_at' => $result->expiresAt,
                    'checkout_state' => Payment::CHECKOUT_READY,
                    'creation_lease_expires_at' => null,
                    'snap_token' => $payment->provider === Payment::PROVIDER_MIDTRANS
                        ? $result->sessionId
                        : null,
                ]);

                Log::info('[CheckoutService] Checkout created successfully', [
                    'payment_id' => $payment->id,
                    'order_id' => $payment->order_id,
                    'session_id' => $result->sessionId,
                ]);
            } else {
                // Mark as failed
                $payment->update([
                    'checkout_state' => Payment::CHECKOUT_FAILED,
                    'creation_lease_expires_at' => null,
                    'review_reason' => $result->error,
                ]);

                Log::warning('[CheckoutService] Checkout creation failed', [
                    'payment_id' => $payment->id,
                    'order_id' => $payment->order_id,
                    'error' => $result->error,
                ]);
            }

            return $result;
        } catch (\Exception $e) {
            // Handle timeout or unknown outcome
            Log::error('[CheckoutService] Checkout creation exception', [
                'payment_id' => $payment->id,
                'order_id' => $payment->order_id,
                'error' => $e->getMessage(),
            ]);

            // Mark as unknown - don't know if remote session was created
            $payment->update([
                'checkout_state' => Payment::CHECKOUT_UNKNOWN,
                'creation_lease_expires_at' => null,
                'review_reason' => 'Creation interrupted: '.$e->getMessage(),
            ]);

            return CheckoutResult::error(
                message: 'Payment session creation was interrupted. Please try again or contact support.',
                code: 'unknown_outcome',
                canRetry: false, // Don't auto-retry unknown outcomes
            );
        }
    }

    /**
     * Create immutable snapshot of payment request.
     */
    private function createRequestSnapshot(Payable $payable, Payment $payment): array
    {
        return [
            'amount' => (int) $payment->amount,
            'currency' => config('payments.currency', 'IDR'),
            'description' => $payable->getPaymentDescription(),
            'items' => $payable->getPaymentItems($payment),
            'customer' => $payable->getPaymentCustomer(),
            'created_at' => now()->toISOString(),
        ];
    }

    /**
     * Generate unique order ID.
     */
    private function generateOrderId(): string
    {
        // Format: ORD-{timestamp}-{random}
        $timestamp = now()->format('YmdHis');
        $random = strtoupper(substr(md5(uniqid(mt_rand(), true)), 0, 6));

        return "ORD-{$timestamp}-{$random}";
    }
}
