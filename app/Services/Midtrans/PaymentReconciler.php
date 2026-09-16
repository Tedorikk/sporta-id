<?php

namespace App\Services\Midtrans;

use App\Models\Payment;
use Illuminate\Database\Eloquent\Relations\Relation;
use Illuminate\Support\Facades\DB;

/**
 * Applies a Midtrans transaction status (whether it arrived via the webhook
 * or was pulled on demand via MidtransClient::getStatus()) to a Payment and
 * whatever that payment was for. This is the only place either of those ever
 * changes as a result of a payment event — client-side Snap callbacks only
 * drive UI redirects, since client state can't be trusted for money.
 *
 * What "paid" means is the payable's own business: see {@see Payable}.
 */
class PaymentReconciler
{
    public function reconcile(Payment $payment, array $transaction): void
    {
        $settled = DB::transaction(function () use ($payment, $transaction) {
            $payment = Payment::whereKey($payment->id)->lockForUpdate()->first();

            $paymentStatus = $this->resolvePaymentStatus($transaction);

            $payment->update([
                'status' => $paymentStatus,
                'midtrans_transaction_id' => $transaction['transaction_id'] ?? $payment->midtrans_transaction_id,
                'payment_type' => $transaction['payment_type'] ?? $payment->payment_type,
                'raw_notification' => $transaction,
                'paid_at' => $paymentStatus === Payment::STATUS_SETTLEMENT ? now() : $payment->paid_at,
            ]);

            $payable = $this->lockPayable($payment);

            if ($payable === null) {
                return null;
            }

            return $payable->applyPaymentStatus($payment, $paymentStatus) ? $payable : null;
        });

        // Outside the transaction: mail and other side effects must not run
        // inside it, and the guard in applyPaymentStatus() means a replayed
        // webhook never gets this far twice.
        $settled?->handlePaymentSettled();
    }

    /**
     * Loads the paid-for record with its row locked, so two notifications for
     * the same order can't both decide they were the one that settled it.
     */
    private function lockPayable(Payment $payment): ?Payable
    {
        if ($payment->payable_type === null || $payment->payable_id === null) {
            return null;
        }

        $class = Relation::getMorphedModel($payment->payable_type) ?? $payment->payable_type;

        if (! class_exists($class)) {
            return null;
        }

        $payable = $class::query()->whereKey($payment->payable_id)->lockForUpdate()->first();

        return $payable instanceof Payable ? $payable : null;
    }

    private function resolvePaymentStatus(array $transaction): string
    {
        $transactionStatus = $transaction['transaction_status'] ?? null;
        $fraudStatus = $transaction['fraud_status'] ?? null;

        return match (true) {
            in_array($transactionStatus, ['capture', 'settlement'], true) && $fraudStatus !== 'deny' => Payment::STATUS_SETTLEMENT,
            $transactionStatus === 'pending' => Payment::STATUS_PENDING,
            $transactionStatus === 'expire' => Payment::STATUS_EXPIRE,
            $transactionStatus === 'cancel' => Payment::STATUS_CANCEL,
            $transactionStatus === 'deny' || $fraudStatus === 'deny' => Payment::STATUS_DENY,
            default => Payment::STATUS_FAILURE,
        };
    }
}
