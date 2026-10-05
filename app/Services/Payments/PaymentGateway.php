<?php

namespace App\Services\Payments;

use App\Models\Payment;

/**
 * Provider-agnostic payment gateway operations.
 *
 * Implementations handle provider-specific HTTP transport, request/response
 * formats, and map results to the neutral CheckoutResult and PaymentOutcome.
 */
interface PaymentGateway
{
    /**
     * Create a new payment session/checkout for the given payment and payable.
     *
     * @param  Payment  $payment  Local payment record with order_id, amount, payable
     * @param  Payable  $payable  Source of items, customer, and description
     * @param  string  $successUrl  Where to redirect after successful payment
     * @param  string  $failureUrl  Where to redirect after failed/canceled payment
     * @return CheckoutResult Session URL and metadata, or error
     */
    public function createCheckout(
        Payment $payment,
        Payable $payable,
        string $successUrl,
        string $failureUrl
    ): CheckoutResult;

    /**
     * Retrieve the current status of a payment from the provider.
     *
     * @param  Payment  $payment  Payment with provider session/transaction ID
     * @return PaymentOutcome Normalized payment state
     */
    public function retrieveStatus(Payment $payment): PaymentOutcome;

    /**
     * Cancel a pending payment session if the provider supports it.
     *
     * @param  Payment  $payment  Payment to cancel
     * @return PaymentOutcome Resulting state after cancellation
     */
    public function cancelCheckout(Payment $payment): PaymentOutcome;

    /**
     * Get the provider identifier for this gateway.
     */
    public function getProvider(): string;
}
