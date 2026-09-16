<?php

namespace App\Services\Midtrans;

use App\Models\Payment;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\MorphMany;

/**
 * Something a Midtrans payment can be made against — a registration, a batch
 * of paid votes, and whatever comes next.
 *
 * The point of this contract is that {@see PaymentReconciler} stays the only
 * place a payment outcome is applied, no matter what was bought: it resolves
 * the payable and hands the outcome over, and the payable decides what being
 * paid actually means for it.
 *
 * @phpstan-require-extends Model
 */
interface Payable
{
    /**
     * The payments made against this payable.
     *
     * Deliberately left ungenericised: the declaring model differs per
     * implementor, and each one annotates its own payments() precisely.
     */
    public function payments(): MorphMany;

    /**
     * Applies a resolved payment status to this payable's own state.
     *
     * Must return true only when this call is what moved the payable into a
     * paid state, so a replayed or duplicated notification never fires the
     * settled side effects twice. Runs inside a transaction, with the payable
     * row locked.
     */
    public function applyPaymentStatus(Payment $payment, string $paymentStatus): bool;

    /**
     * Side effects for a payable that has just been paid — mail, and anything
     * else that must not run inside the reconciling transaction.
     */
    public function handlePaymentSettled(): void;

    /**
     * Midtrans Snap `item_details`. Without it a payer only ever sees an order
     * id and a total on the payment page.
     *
     * @return array<int, array<string, mixed>>
     */
    public function midtransItemDetails(Payment $payment): array;

    /**
     * Midtrans Snap `customer_details`.
     *
     * @return array<string, mixed>
     */
    public function midtransCustomerDetails(): array;
}
