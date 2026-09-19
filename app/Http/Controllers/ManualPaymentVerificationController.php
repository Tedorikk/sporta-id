<?php

namespace App\Http\Controllers;

use App\Models\Event;
use App\Models\Payment;
use App\Models\Registration;
use App\Services\Midtrans\PaymentReconciler;
use Illuminate\Http\Request;

/**
 * An organizer's decision on a manual-transfer payment — the hand-verified
 * equivalent of the Midtrans webhook. Goes through the same
 * {@see PaymentReconciler} locking and settlement path as a real webhook, so
 * "confirmed" means the same thing everywhere no matter how the money moved.
 */
class ManualPaymentVerificationController extends Controller
{
    public function __construct(private readonly PaymentReconciler $reconciler) {}

    public function approve(Event $event, Registration $registration)
    {
        $payment = $this->pendingManualPayment($event, $registration);

        $this->reconciler->applyManualDecision($payment, Payment::STATUS_SETTLEMENT, auth()->id());

        return back()->with(['toast' => [
            'title' => 'Success',
            'description' => 'Payment verified — registration confirmed.',
        ]]);
    }

    public function reject(Request $request, Event $event, Registration $registration)
    {
        $payment = $this->pendingManualPayment($event, $registration);

        $this->reconciler->applyManualDecision($payment, Payment::STATUS_DENY, auth()->id());

        return back()->with(['toast' => [
            'title' => 'Success',
            'description' => 'Payment rejected — the registration is now rejected and its slot released.',
        ]]);
    }

    private function pendingManualPayment(Event $event, Registration $registration): Payment
    {
        abort_unless($registration->event_id === $event->id, 404);
        abort_unless($registration->status === Registration::STATUS_PENDING_PAYMENT, 422, 'This registration is not awaiting payment.');

        $payment = $registration->payments()->whereNull('verified_at')->latest('id')->first();

        abort_if($payment === null, 422, 'No pending payment found for this registration.');
        abort_if($payment->proof_path === null, 422, 'No payment proof has been uploaded yet.');

        return $payment;
    }
}
