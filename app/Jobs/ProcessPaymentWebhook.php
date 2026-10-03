<?php

namespace App\Jobs;

use App\Models\Payment;
use App\Models\PaymentWebhookReceipt;
use App\Services\Payments\PaymentGatewayManager;
use App\Services\Payments\PaymentReconciler;
use App\Services\Xendit\XenditStatusMapper;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class ProcessPaymentWebhook implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 5;
    public int $backoff = 60; // Start with 1 minute backoff

    /**
     * Create a new job instance.
     */
    public function __construct(
        public PaymentWebhookReceipt $receipt
    ) {}

    /**
     * Execute the job.
     */
    public function handle(
        XenditStatusMapper $mapper,
        PaymentReconciler $reconciler
    ): void {
        // Check if already processed
        if ($this->receipt->processing_state === 'processed') {
            Log::info('[ProcessWebhook] Receipt already processed', [
                'receipt_id' => $this->receipt->id,
            ]);
            return;
        }

        // Mark as processing
        $this->receipt->markProcessing();

        try {
            // Parse webhook payload
            $payload = $this->receipt->sanitized_payload;
            
            // Map to payment outcome
            $outcome = $mapper->mapWebhookToOutcome($payload);

            // Find the payment
            $payment = $this->findPayment($this->receipt);

            if (!$payment) {
                $this->handleUnmatchedPayment($this->receipt);
                return;
            }

            // Validate binding
            $this->validateBinding($payment, $this->receipt, $outcome);

            // Link receipt to payment if not already linked
            if (!$this->receipt->payment_id) {
                $this->receipt->update(['payment_id' => $payment->id]);
            }

            // Reconcile payment
            $reconciler->reconcile($payment, $outcome);

            // Mark receipt as processed
            $this->receipt->markProcessed();

            Log::info('[ProcessWebhook] Webhook processed successfully', [
                'receipt_id' => $this->receipt->id,
                'payment_id' => $payment->id,
                'status' => $outcome->status,
            ]);

        } catch (\InvalidArgumentException $e) {
            // Validation error - don't retry
            $this->receipt->markFailed($e->getMessage());

            Log::error('[ProcessWebhook] Validation failed', [
                'receipt_id' => $this->receipt->id,
                'error' => $e->getMessage(),
            ]);

            // Don't re-throw - this is a permanent failure
            return;

        } catch (\Exception $e) {
            // Other error - retry
            $this->receipt->markFailed($e->getMessage());

            Log::error('[ProcessWebhook] Processing failed', [
                'receipt_id' => $this->receipt->id,
                'attempt' => $this->receipt->processing_attempts,
                'error' => $e->getMessage(),
            ]);

            // Re-throw to trigger retry
            throw $e;
        }
    }

    /**
     * Find payment by session ID or reference ID.
     */
    private function findPayment(PaymentWebhookReceipt $receipt): ?Payment
    {
        // Try to find by provider session ID first
        if ($receipt->session_id) {
            $payment = Payment::where('provider', 'xendit')
                ->where('provider_session_id', $receipt->session_id)
                ->first();

            if ($payment) {
                return $payment;
            }
        }

        // Fall back to reference ID (order_id)
        if ($receipt->reference_id) {
            $payment = Payment::where('provider', 'xendit')
                ->where('order_id', $receipt->reference_id)
                ->first();

            if ($payment) {
                return $payment;
            }
        }

        // Try to find by order_id regardless of provider (for migration edge cases)
        if ($receipt->reference_id) {
            $payment = Payment::where('order_id', $receipt->reference_id)->first();

            if ($payment && !$payment->provider) {
                // Backfill provider if missing
                $payment->update(['provider' => 'xendit']);
                return $payment;
            }
        }

        return null;
    }

    /**
     * Validate that webhook matches payment binding.
     */
    private function validateBinding(
        Payment $payment,
        PaymentWebhookReceipt $receipt,
        $outcome
    ): void {
        // Validate business ID matches
        $expectedBusinessId = config('services.xendit.business_id');
        if ($expectedBusinessId && $receipt->provider_account_id !== $expectedBusinessId) {
            throw new \InvalidArgumentException(
                "Business ID mismatch: expected {$expectedBusinessId}, got {$receipt->provider_account_id}"
            );
        }

        // Validate amount matches (for completed payments)
        if ($outcome->status === 'settlement') {
            $expectedAmount = (int) $payment->amount;
            if ($outcome->amount && $outcome->amount !== $expectedAmount) {
                throw new \InvalidArgumentException(
                    "Amount mismatch: expected {$expectedAmount}, got {$outcome->amount}"
                );
            }
        }

        // Validate currency
        if ($outcome->currency && $outcome->currency !== $payment->currency) {
            throw new \InvalidArgumentException(
                "Currency mismatch: expected {$payment->currency}, got {$outcome->currency}"
            );
        }
    }

    /**
     * Handle webhook for payment that doesn't exist.
     */
    private function handleUnmatchedPayment(PaymentWebhookReceipt $receipt): void
    {
        $reason = "No payment found for session {$receipt->session_id} / reference {$receipt->reference_id}";
        $receipt->markUnmatched($reason);

        Log::warning('[ProcessWebhook] Unmatched payment', [
            'receipt_id' => $receipt->id,
            'session_id' => $receipt->session_id,
            'reference_id' => $receipt->reference_id,
        ]);

        // Alert for investigation
        // TODO: Add alerting mechanism (Slack, email, etc.)
    }

    /**
     * Calculate the number of seconds to wait before retrying the job.
     */
    public function backoff(): array
    {
        // Exponential backoff: 1 min, 2 min, 4 min, 8 min, 16 min
        return [60, 120, 240, 480, 960];
    }

    /**
     * Handle a job failure.
     */
    public function failed(\Throwable $exception): void
    {
        $this->receipt->markFailed($exception->getMessage());

        Log::error('[ProcessWebhook] Job permanently failed', [
            'receipt_id' => $this->receipt->id,
            'attempts' => $this->receipt->processing_attempts,
            'error' => $exception->getMessage(),
        ]);

        // Alert for manual intervention
        // TODO: Add alerting mechanism
    }
}
