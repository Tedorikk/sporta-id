<?php

namespace App\Http\Controllers;

use App\Models\Event;
use App\Models\Payment;
use App\Models\PaymentRefundRecord;
use App\Models\Registration;
use App\Models\RegistrationOrder;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class RegistrationRefundController extends Controller
{
    /**
     * Records that an organizer refunded a paid registration.
     *
     * The money itself is still moved in the Midtrans dashboard — this does not
     * call Midtrans's refund API. What it does is give the refund a record in
     * the app: the registration is cancelled and its quota goes back to the
     * pool so the slot can be resold.
     *
     * A registration bought through a {@see RegistrationOrder}
     * has no payment of its own — the order's one payment covers every
     * participant in it — so only that registration is cancelled; the
     * shared payment is left alone (it may still be owed to other,
     * still-confirmed participants) and its own settlement is what's
     * checked instead of a payment on the registration.
     */
    public function store(Request $request, Event $event, Registration $registration)
    {
        abort_unless($registration->event_id === $event->id, 404);

        $validated = $request->validate([
            'note' => ['nullable', 'string', 'max:500'],
        ]);

        $registration->loadMissing('registrationOrder');
        $isGroupOrder = $registration->registration_order_id !== null;

        $payment = $isGroupOrder
            ? $registration->registrationOrder?->payments()->where('status', Payment::STATUS_SETTLEMENT)->latest('paid_at')->first()
            : $registration->payments()->where('status', Payment::STATUS_SETTLEMENT)->latest('paid_at')->first();

        abort_if($payment === null, 422, 'This registration has no settled payment to refund.');

        DB::transaction(function () use ($registration, $payment, $validated, $isGroupOrder) {
            $registration = Registration::whereKey($registration->id)->lockForUpdate()->first();

            // Refunding twice would release the same quota slot twice.
            abort_if(
                $registration->status === Registration::STATUS_CANCELLED,
                422,
                'This registration has already been cancelled.'
            );

            // The order's payment covers other participants too — only mark
            // it refunded when it is this registration's own.
            if (! $isGroupOrder) {
                $payment->update([
                    'status' => Payment::STATUS_REFUND,
                ]);
            }

            PaymentRefundRecord::create([
                'payment_id' => $payment->id,
                'registration_id' => $registration->id,
                'amount' => $registration->getPaymentAmount(),
                'provider' => $payment->provider ?? 'midtrans',
                'refunded_by' => auth()->id(),
                'refund_note' => $validated['note'] ?? null,
                'refunded_at' => now(),
            ]);

            $registration->update(['status' => Registration::STATUS_CANCELLED]);
            $registration->registrationCategory()->decrement('registered_count');
        });

        $providerName = match ($payment->provider) {
            'xendit' => 'Xendit',
            'manual_transfer' => 'manual',
            default => 'Midtrans',
        };

        $instructions = $providerName === 'manual'
            ? 'Refund recorded. You will need to manually transfer the money back to the participant.'
            : "Refund recorded. Issue the actual refund in your {$providerName} dashboard if you have not already.";

        if ($isGroupOrder && $providerName !== 'manual') {
            $instructions = "Refund recorded for this participant. The order's other participants are unaffected — issue their portion of the refund in your {$providerName} dashboard if needed.";
        } elseif ($isGroupOrder) {
            $instructions = "Refund recorded for this participant. The order's other participants are unaffected — manually transfer their portion back to the participant if needed.";
        }

        return back()->with(['toast' => [
            'title' => 'Success',
            'description' => $instructions,
        ]]);
    }
}
