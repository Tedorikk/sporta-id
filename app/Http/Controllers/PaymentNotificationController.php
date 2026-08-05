<?php

namespace App\Http\Controllers;

use App\Models\Payment;
use App\Services\Midtrans\MidtransClient;
use App\Services\Midtrans\PaymentReconciler;
use Illuminate\Http\Request;

class PaymentNotificationController extends Controller
{
    public function __construct(private readonly PaymentReconciler $reconciler) {}

    /**
     * Midtrans's webhook target — see PaymentReconciler for what actually
     * happens to the Payment/Registration once a notification is verified.
     */
    public function handle(Request $request)
    {
        $notification = $request->all();

        abort_unless(MidtransClient::isValidSignature($notification), 403, 'Invalid signature.');

        $payment = Payment::where('order_id', $notification['order_id'] ?? null)->firstOrFail();

        $this->reconciler->reconcile($payment, $notification);

        return response()->json(['message' => 'OK']);
    }
}
