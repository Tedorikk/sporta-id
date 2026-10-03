<?php

namespace App\Services\Payments;

/**
 * Normalized payment outcome from a provider.
 *
 * Used internally by reconciliation to apply verified payment state changes.
 * Not exposed directly to public APIs.
 */
class PaymentOutcome
{
    public function __construct(
        public readonly string $provider,
        public readonly string $status,
        public readonly ?string $providerSessionId = null,
        public readonly ?string $providerPaymentId = null,
        public readonly ?string $providerRequestId = null,
        public readonly ?string $providerStatus = null,
        public readonly ?int $amount = null,
        public readonly ?string $currency = null,
        public readonly ?\DateTimeInterface $paidAt = null,
        public readonly ?\DateTimeInterface $providerUpdatedAt = null,
        public readonly array $metadata = [],
    ) {}

    public static function settled(
        string $provider,
        int $amount,
        string $currency,
        \DateTimeInterface $paidAt,
        ?string $sessionId = null,
        ?string $paymentId = null,
        ?string $requestId = null,
        ?string $providerStatus = null,
        array $metadata = [],
    ): self {
        return new self(
            provider: $provider,
            status: 'settlement',
            providerSessionId: $sessionId,
            providerPaymentId: $paymentId,
            providerRequestId: $requestId,
            providerStatus: $providerStatus,
            amount: $amount,
            currency: $currency,
            paidAt: $paidAt,
            metadata: $metadata,
        );
    }

    public static function pending(
        string $provider,
        ?string $sessionId = null,
        ?string $providerStatus = null,
    ): self {
        return new self(
            provider: $provider,
            status: 'pending',
            providerSessionId: $sessionId,
            providerStatus: $providerStatus,
        );
    }

    public static function expired(
        string $provider,
        ?string $sessionId = null,
        ?string $providerStatus = null,
    ): self {
        return new self(
            provider: $provider,
            status: 'expire',
            providerSessionId: $sessionId,
            providerStatus: $providerStatus,
        );
    }

    public static function canceled(
        string $provider,
        ?string $sessionId = null,
        ?string $providerStatus = null,
    ): self {
        return new self(
            provider: $provider,
            status: 'cancel',
            providerSessionId: $sessionId,
            providerStatus: $providerStatus,
        );
    }
}
