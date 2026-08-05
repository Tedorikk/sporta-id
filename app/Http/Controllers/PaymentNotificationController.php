<?php

namespace App\Http\Controllers;

use App\Models\Payment;
use App\Models\Registration;
use App\Services\Midtrans\MidtransClient;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class PaymentNotificationController extends Controller
{
    /**
     * Midtrans's webhook target. This is the only place Payment/Registration
     * status is ever written from a payment event — the Snap popup's client-side
     * callbacks only drive UI redirects, since client state can't be trusted
     * for money.
     */
    public function handle(Request $request)
    {
        $notification = $request->all();

        abort_unless(MidtransClient::isValidSignature($notification), 403, 'Invalid signature.');

        $payment = Payment::where('order_id', $notification['order_id'] ?? null)->firstOrFail();

        DB::transaction(function () use ($payment, $notification) {
            $payment = Payment::whereKey($payment->id)->lockForUpdate()->first();
            $registration = Registration::whereKey($payment->registration_id)->lockForUpdate()->first();

            $paymentStatus = $this->resolvePaymentStatus($notification);

            $payment->update([
                'status' => $paymentStatus,
                'midtrans_transaction_id' => $notification['transaction_id'] ?? $payment->midtrans_transaction_id,
                'payment_type' => $notification['payment_type'] ?? $payment->payment_type,
                'raw_notification' => $notification,
                'paid_at' => $paymentStatus === Payment::STATUS_SETTLEMENT ? now() : $payment->paid_at,
            ]);

            // Only act on a registration that's still awaiting this outcome —
            // keeps a retried/duplicate webhook from double-releasing quota.
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

        return response()->json(['message' => 'OK']);
    }

    private function resolvePaymentStatus(array $notification): string
    {
        $transactionStatus = $notification['transaction_status'] ?? null;
        $fraudStatus = $notification['fraud_status'] ?? null;

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
