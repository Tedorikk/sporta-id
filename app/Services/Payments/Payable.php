<?php

namespace App\Services\Payments;

use App\Models\Payment;
use Illuminate\Database\Eloquent\Relations\MorphMany;

/**
 * Something that can be paid for — a registration, an order, a batch of votes.
 *
 * This contract is provider-neutral. Implementors provide item and customer
 * data in a common format, and handle payment state transitions.
 *
 * PaymentReconciler applies verified payment outcomes through this interface,
 * keeping payment logic centralized regardless of what was purchased.
 */
interface Payable
{
    /** @return MorphMany<Payment, $this> */
    public function payments(): MorphMany;

    /**
     * Applies a verified payment status to this payable's state.
     *
     * Must return true only when this call moves the payable into a paid state
     * for the first time. Replayed or duplicate notifications must return false
     * to prevent duplicate side effects.
     *
     * Runs inside a transaction with the payable row locked.
     */
    public function applyPaymentStatus(Payment $payment, string $paymentStatus): bool;

    /**
     * Side effects for a payable that has just been paid — confirmation emails,
     * quota updates, etc. Must not run inside the reconciling transaction.
     */
    public function handlePaymentSettled(): void;

    /**
     * Items being purchased, in provider-neutral format.
     *
     * Each item should have:
     * - reference_id: Unique identifier for this line item
     * - name: Human-readable item name
     * - quantity: Number of units
     * - unit_amount: Price per unit in whole currency units (IDR)
     *
     * @return array<int, array{reference_id: string, name: string, quantity: int, unit_amount: int}>
     */
    public function getPaymentItems(Payment $payment): array;

    /**
     * Customer information for the payment.
     *
     * Should include:
     * - email: Customer email address
     * - mobile_number: E.164 format phone number (optional)
     * - given_names: Customer name (handles single-part names)
     * - surname: Customer surname (optional)
     *
     * @return array{email: string, mobile_number?: string, given_names: string, surname?: string}
     */
    public function getPaymentCustomer(): array;

    /**
     * Total amount to be charged, in whole currency units (IDR).
     * Must match the sum of all item amounts.
     */
    public function getPaymentAmount(): int;

    /**
     * Human-readable description of what is being purchased.
     */
    public function getPaymentDescription(): string;
}
