<?php

namespace App\Services\Payments;

use InvalidArgumentException;

/**
 * Resolves payment gateway implementations by provider name.
 *
 * Routes payment operations to the correct provider based on either:
 * - The stored provider on an existing payment (for status/cancel)
 * - The configured default provider (for new checkouts)
 */
class PaymentGatewayManager
{
    /** @var array<string, PaymentGateway> */
    private array $gateways = [];

    private string $defaultProvider;

    public function __construct()
    {
        $this->defaultProvider = config('payments.gateway', 'midtrans');
    }

    /**
     * Register a gateway implementation for a provider.
     */
    public function register(string $provider, PaymentGateway $gateway): void
    {
        $this->gateways[$provider] = $gateway;
    }

    /**
     * Get the gateway for a specific provider.
     *
     * @throws InvalidArgumentException if provider is not supported
     */
    public function gateway(string $provider): PaymentGateway
    {
        if (! isset($this->gateways[$provider])) {
            throw new InvalidArgumentException("Payment gateway '{$provider}' is not registered.");
        }

        return $this->gateways[$provider];
    }

    /**
     * Get the default gateway for new payment attempts.
     */
    public function defaultGateway(): PaymentGateway
    {
        return $this->gateway($this->defaultProvider);
    }

    /**
     * Get the current default provider name.
     */
    public function getDefaultProvider(): string
    {
        return $this->defaultProvider;
    }

    /**
     * Check if a provider is registered.
     */
    public function hasProvider(string $provider): bool
    {
        return isset($this->gateways[$provider]);
    }

    /**
     * Get all registered provider names.
     *
     * @return array<string>
     */
    public function getProviders(): array
    {
        return array_keys($this->gateways);
    }
}
