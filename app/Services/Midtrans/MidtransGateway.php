<?php

namespace App\Services\Midtrans;

use App\Models\Payment;
use App\Services\Payments\CheckoutResult;
use App\Services\Payments\Payable;
use App\Services\Payments\PaymentGateway;
use App\Services\Payments\PaymentOutcome;
use RuntimeException;

/**
 * Adapter that wraps the existing MidtransClient to implement the
 * provider-neutral PaymentGateway interface.
 *
 * Preserves the current Snap integration while allowing it to coexist
 * with Xendit during the migration transition period.
 */
class MidtransGateway implements PaymentGateway
{
    public function __construct(
        private readonly MidtransClient $client,
    ) {}

    public function createCheckout(
        Payment $payment,
        Payable $payable,
        string $successUrl,
        string $failureUrl
    ): CheckoutResult {
        try {
            // Note: Midtrans Snap doesn't use the success/failure URLs in the API.
            // Return URLs are configured in the Snap embed/popup or in dashboard.
            // We generate a Snap token which the frontend uses to open the Snap modal.

            $snapToken = $this->client->createSnapTransaction($payment);

            // Midtrans Snap tokens don't have a strongly documented expiry,
            // but are generally valid for several hours. We'll set a conservative
            // expiry for consistency with the reservation period.
            $expiresAt = now()->addMinutes(config('payments.session_ttl_minutes', 30));

            return CheckoutResult::success(
                checkoutUrl: $snapToken, // For Midtrans, this is the token, not a URL
                sessionId: $snapToken,
                expiresAt: $expiresAt,
            );
        } catch (RuntimeException $e) {
            return CheckoutResult::error(
                message: 'Failed to create payment session: '.$e->getMessage(),
                code: 'midtrans_error',
                canRetry: true,
            );
        }
    }

    public function retrieveStatus(Payment $payment): PaymentOutcome
    {
        try {
            $status = $this->client->getStatus($payment->order_id);

            return $this->mapStatusToOutcome($status);
        } catch (RuntimeException $e) {
            throw new RuntimeException(
                "Failed to retrieve Midtrans status for {$payment->order_id}: ".$e->getMessage(),
                previous: $e
            );
        }
    }

    public function cancelCheckout(Payment $payment): PaymentOutcome
    {
        // Midtrans Snap doesn't have an explicit cancel API.
        // Cancellation happens when the session expires or the user closes the modal.
        // We'll retrieve current status to see if it's already settled/expired.
        return $this->retrieveStatus($payment);
    }

    public function getProvider(): string
    {
        return 'midtrans';
    }

    /**
     * Map Midtrans transaction status response to normalized PaymentOutcome.
     *
     * Midtrans status values: pending, settlement, capture, deny, cancel, expire, failure
     */
    public function mapStatusToOutcome(array $status): PaymentOutcome
    {
        $transactionStatus = $status['transaction_status'] ?? 'pending';
        $fraudStatus = $status['fraud_status'] ?? null;
        $transactionId = $status['transaction_id'] ?? null;
        $grossAmount = isset($status['gross_amount']) ? (int) $status['gross_amount'] : null;
        $currency = $status['currency'] ?? 'IDR';

        // Map Midtrans status to application status
        if ($fraudStatus === 'deny') {
            $appStatus = 'deny';
        } else {
            $appStatus = match ($transactionStatus) {
                'capture' => $fraudStatus === 'accept' ? 'settlement' : 'pending',
                'settlement' => 'settlement',
                'pending' => 'pending',
                'deny' => 'deny',
                'cancel' => 'cancel',
                'expire' => 'expire',
                'failure' => 'failure',
                default => 'pending',
            };
        }

        // If settled, extract paid timestamp
        $paidAt = null;
        if ($appStatus === 'settlement') {
            if (isset($status['settlement_time'])) {
                $paidAt = new \DateTimeImmutable($status['settlement_time']);
            } elseif (isset($status['transaction_time'])) {
                $paidAt = new \DateTimeImmutable($status['transaction_time']);
            } else {
                $paidAt = now()->toDateTimeImmutable();
            }
        }

        return new PaymentOutcome(
            provider: 'midtrans',
            status: $appStatus,
            providerSessionId: null, // Midtrans doesn't have a separate session ID
            providerPaymentId: $transactionId,
            providerRequestId: null,
            providerStatus: $transactionStatus,
            amount: $grossAmount,
            currency: $currency,
            paidAt: $paidAt,
            metadata: $status,
        );
    }
}
