<?php

namespace App\Services\Midtrans;

use App\Models\Payment;
use App\Models\Registration;
use Illuminate\Support\Facades\DB;

/**
 * Applies a Midtrans transaction status (whether it arrived via the webhook
 * or was pulled on demand via MidtransClient::getStatus()) to a Payment and
 * its Registration. This is the only place either of those ever changes as
 * a result of a payment event — client-side Snap callbacks only drive UI
 * redirects, since client state can't be trusted for money.
 */
class PaymentReconciler
{
    public function reconcile(Payment $payment, array $transaction): void
    {
        DB::transaction(function () use ($payment, $transaction) {
            $payment = Payment::whereKey($payment->id)->lockForUpdate()->first();
            $registration = Registration::whereKey($payment->registration_id)->lockForUpdate()->first();

            $paymentStatus = $this->resolvePaymentStatus($transaction);

            $payment->update([
                'status' => $paymentStatus,
                'midtrans_transaction_id' => $transaction['transaction_id'] ?? $payment->midtrans_transaction_id,
                'payment_type' => $transaction['payment_type'] ?? $payment->payment_type,
                'raw_notification' => $transaction,
                'paid_at' => $paymentStatus === Payment::STATUS_SETTLEMENT ? now() : $payment->paid_at,
            ]);

            // Only act on a registration that's still awaiting this outcome —
            // keeps a retried/duplicate notification (or re-running the manual
            // reconcile command) from double-releasing quota.
            if ($registration->status !== Registration::STATUS_PENDING_PAYMENT) {
                return;
            }

            if ($paymentStatus === Payment::STATUS_SETTLEMENT) {
                $registration->update(['status' => Registration::STATUS_CONFIRMED, 'expires_at' => null]);

                return;
            }

            if ($paymentStatus === Payment::STATUS_PENDING) {
                return;
            }

            $registration->update([
                'status' => $paymentStatus === Payment::STATUS_EXPIRE ? Registration::STATUS_EXPIRED : Registration::STATUS_REJECTED,
            ]);
            $registration->registrationCategory()->decrement('registered_count');
        });
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
