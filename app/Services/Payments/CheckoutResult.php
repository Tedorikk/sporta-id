<?php

namespace App\Services\Payments;

/**
 * Result of a checkout session creation attempt.
 *
 * Returned to the controller/frontend to display the checkout UI or error state.
 */
class CheckoutResult
{
    public function __construct(
        public readonly bool $success,
        public readonly ?string $checkoutUrl = null,
        public readonly ?string $sessionId = null,
        public readonly ?\DateTimeInterface $expiresAt = null,
        public readonly ?string $error = null,
        public readonly ?string $errorCode = null,
        public readonly bool $canRetry = false,
    ) {}

    public static function success(
        string $checkoutUrl,
        string $sessionId,
        \DateTimeInterface $expiresAt
    ): self {
        return new self(
            success: true,
            checkoutUrl: $checkoutUrl,
            sessionId: $sessionId,
            expiresAt: $expiresAt,
        );
    }

    public static function preparing(): self
    {
        return new self(
            success: false,
            error: 'Payment session is being prepared by another request.',
            errorCode: 'preparing',
            canRetry: true,
        );
    }

    public static function error(string $message, string $code, bool $canRetry = true): self
    {
        return new self(
            success: false,
            error: $message,
            errorCode: $code,
            canRetry: $canRetry,
        );
    }

    public static function unavailable(): self
    {
        return new self(
            success: false,
            error: 'Payment checkout is temporarily unavailable.',
            errorCode: 'unavailable',
            canRetry: false,
        );
    }
}
