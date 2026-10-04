<?php

namespace App\Http\Controllers;

use App\Models\Event;
use App\Models\Payment;
use App\Models\Registration;
use App\Services\Payments\PaymentOutcome;
use App\Services\Payments\PaymentReconciler;
use Illuminate\Http\Request;

/**
 * An organizer's decision on a manual-transfer payment — the hand-verified
 * equivalent of a webhook. Goes through the same
 * {@see PaymentReconciler} locking and settlement path as a real webhook, so
 * "confirmed" means the same thing everywhere no matter how the money moved.
 */
class ManualPaymentVerificationController extends Controller
{
    public function __construct(private readonly PaymentReconciler $reconciler) {}

    public function approve(Event $event, Registration $registration)
    {
        $payment = $this->pendingManualPayment($event, $registration);

        $payment->update([
            'verified_by' => auth()->id(),
            'verified_at' => now(),
        ]);

        $outcome = PaymentOutcome::settled(
            provider: 'manual_transfer',
            amount: $payment->amount,
            currency: 'IDR',
            paidAt: now(),
            providerStatus: 'approved'
        );

        $this->reconciler->reconcile($payment, $outcome);

        return back()->with(['toast' => [
            'title' => 'Success',
            'description' => 'Payment verified — registration confirmed.',
        ]]);
    }

    public function reject(Request $request, Event $event, Registration $registration)
    {
        $payment = $this->pendingManualPayment($event, $registration);

        $payment->update([
            'verified_by' => auth()->id(),
            'verified_at' => now(),
        ]);

        $outcome = new PaymentOutcome(
            provider: 'manual_transfer',
            status: Payment::STATUS_DENY,
            providerStatus: 'rejected',
            providerUpdatedAt: now(),
        );

        $this->reconciler->reconcile($payment, $outcome);

        // For manual payments, rejecting the proof cancels the whole registration
        // (unlike online checkouts where the user can just try another card).
        $registration->applyPaymentStatus($payment, Payment::STATUS_DENY);

        return back()->with(['toast' => [
            'title' => 'Success',
            'description' => 'Payment rejected — the registration is now rejected and its slot released.',
        ]]);
    }

    private function pendingManualPayment(Event $event, Registration $registration): Payment
    {
        abort_unless($registration->event_id === $event->id, 404);
        abort_unless($registration->status === Registration::STATUS_PENDING_PAYMENT, 422, 'This registration is not awaiting payment.');

        $payment = $registration->payments()
            ->where('provider', 'manual_transfer')
            ->whereNull('verified_at')
            ->latest('id')
            ->first();

        abort_if($payment === null, 422, 'No pending payment found for this registration.');
        abort_if($payment->proof_path === null, 422, 'No payment proof has been uploaded yet.');

        return $payment;
    }
}
