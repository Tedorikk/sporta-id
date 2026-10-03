<?php

namespace App\Services\Xendit;

use App\Services\Payments\PaymentOutcome;
use InvalidArgumentException;

/**
 * Maps Xendit API responses to normalized payment outcomes.
 *
 * Handles session status mapping, webhook event mapping, and validation
 * of required fields like business_id, amount, and currency.
 */
class XenditStatusMapper
{
    private string $expectedBusinessId;
    private string $expectedMode;

    public function __construct()
    {
        $this->expectedBusinessId = config('services.xendit.business_id');
        $this->expectedMode = config('services.xendit.mode', 'test');
    }

    /**
     * Map a session retrieval response to PaymentOutcome.
     *
     * @param array $session Session data from GET /sessions/{id}
     * @return PaymentOutcome
     * @throws InvalidArgumentException if session data is invalid
     */
    public function mapSessionToOutcome(array $session): PaymentOutcome
    {
        $this->validateSession($session);

        $status = $session['status'] ?? 'ACTIVE';
        $sessionId = $session['payment_session_id'] ?? null;
        $paymentId = $session['payment_id'] ?? null;
        $requestId = $session['payment_request_id'] ?? null;

        return match ($status) {
            'COMPLETED' => $this->mapCompletedSession($session),
            'ACTIVE' => PaymentOutcome::pending(
                provider: 'xendit',
                sessionId: $sessionId,
                providerStatus: $status,
            ),
            'EXPIRED' => PaymentOutcome::expired(
                provider: 'xendit',
                sessionId: $sessionId,
                providerStatus: $status,
            ),
            'CANCELED' => PaymentOutcome::canceled(
                provider: 'xendit',
                sessionId: $sessionId,
                providerStatus: $status,
            ),
            default => throw new InvalidArgumentException("Unknown Xendit session status: {$status}"),
        };
    }

    /**
     * Map a webhook event to PaymentOutcome.
     *
     * @param array $webhook Webhook payload with 'event' and 'data'
     * @return PaymentOutcome
     * @throws InvalidArgumentException if webhook is invalid
     */
    public function mapWebhookToOutcome(array $webhook): PaymentOutcome
    {
        $event = $webhook['event'] ?? null;
        $data = $webhook['data'] ?? [];

        if (!$event || !$data) {
            throw new InvalidArgumentException('Invalid webhook: missing event or data');
        }

        $this->validateSession($data, $webhook['business_id'] ?? null);

        return match ($event) {
            'payment_session.completed' => $this->mapCompletedSession($data),
            'payment_session.expired' => PaymentOutcome::expired(
                provider: 'xendit',
                sessionId: $data['payment_session_id'] ?? null,
                providerStatus: $data['status'] ?? 'EXPIRED',
            ),
            default => throw new InvalidArgumentException("Unsupported webhook event: {$event}"),
        };
    }

    /**
     * Map a completed session to a settled PaymentOutcome.
     */
    private function mapCompletedSession(array $session): PaymentOutcome
    {
        $amount = $session['amount'] ?? null;
        $currency = $session['currency'] ?? null;
        $sessionId = $session['payment_session_id'] ?? null;
        $paymentId = $session['payment_id'] ?? null;
        $requestId = $session['payment_request_id'] ?? null;
        $status = $session['status'] ?? 'COMPLETED';

        // Extract or use current time for paid_at
        // Xendit doesn't always provide a specific settlement timestamp in the session
        // Use updated or created time as fallback
        $paidAt = null;
        if (isset($session['updated'])) {
            $paidAt = new \DateTimeImmutable($session['updated']);
        } elseif (isset($session['created'])) {
            $paidAt = new \DateTimeImmutable($session['created']);
        } else {
            $paidAt = new \DateTimeImmutable();
        }

        if (!$amount || !$currency) {
            throw new InvalidArgumentException('Completed session missing amount or currency');
        }

        return PaymentOutcome::settled(
            provider: 'xendit',
            amount: (int) $amount,
            currency: $currency,
            paidAt: $paidAt,
            sessionId: $sessionId,
            paymentId: $paymentId,
            requestId: $requestId,
            providerStatus: $status,
            metadata: $session,
        );
    }

    /**
     * Validate session data for required fields and business ID match.
     */
    private function validateSession(array $session, ?string $webhookBusinessId = null): void
    {
        // Validate business_id matches (from session or webhook envelope)
        $businessId = $webhookBusinessId ?? ($session['business_id'] ?? null);
        
        if ($businessId && $this->expectedBusinessId && $businessId !== $this->expectedBusinessId) {
            throw new InvalidArgumentException(
                "Business ID mismatch: expected {$this->expectedBusinessId}, got {$businessId}"
            );
        }

        // Validate session type is PAY
        if (isset($session['session_type']) && $session['session_type'] !== 'PAY') {
            throw new InvalidArgumentException(
                "Unsupported session type: {$session['session_type']}"
            );
        }

        // Validate currency is IDR (for now, single-currency system)
        if (isset($session['currency']) && $session['currency'] !== 'IDR') {
            throw new InvalidArgumentException(
                "Unsupported currency: {$session['currency']}"
            );
        }

        // Validate country is ID
        if (isset($session['country']) && $session['country'] !== 'ID') {
            throw new InvalidArgumentException(
                "Unsupported country: {$session['country']}"
            );
        }
    }
}
