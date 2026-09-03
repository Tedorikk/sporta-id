<?php

namespace App\Http\Controllers;

use App\Models\Event;
use App\Models\Payment;
use App\Models\Registration;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class RegistrationRefundController extends Controller
{
    /**
     * Records that an organizer refunded a paid registration.
     *
     * The money itself is still moved in the Midtrans dashboard — this does not
     * call Midtrans's refund API. What it does is give the refund a record in
     * the app: the payment is marked refunded, the registration is cancelled,
     * and its quota goes back to the pool so the slot can be resold.
     */
    public function store(Request $request, Event $event, Registration $registration)
    {
        abort_unless($registration->event_id === $event->id, 404);

        $validated = $request->validate([
            'note' => ['nullable', 'string', 'max:500'],
        ]);

        $payment = $registration->payments()
            ->where('status', Payment::STATUS_SETTLEMENT)
            ->latest('paid_at')
            ->first();

        abort_if($payment === null, 422, 'This registration has no settled payment to refund.');

        DB::transaction(function () use ($registration, $payment, $validated) {
            $registration = Registration::whereKey($registration->id)->lockForUpdate()->first();

            // Refunding twice would release the same quota slot twice.
            abort_if(
                $registration->status === Registration::STATUS_CANCELLED,
                422,
                'This registration has already been cancelled.'
            );

            $payment->update([
                'status' => Payment::STATUS_REFUND,
                'raw_notification' => [
                    ...($payment->raw_notification ?? []),
                    'refund' => [
                        'recorded_by' => auth()->id(),
                        'recorded_at' => now()->toIso8601String(),
                        'note' => $validated['note'] ?? null,
                    ],
                ],
            ]);

            $registration->update(['status' => Registration::STATUS_CANCELLED]);
            $registration->registrationCategory()->decrement('registered_count');
        });

        return back()->with(['toast' => [
            'title' => 'Success',
            'description' => 'Refund recorded. Issue the actual refund in your Midtrans dashboard if you have not already.',
        ]]);
    }
}
