<?php

namespace App\Http\Controllers;

use App\Models\Event;
use App\Models\Registration;

class RegistrationVerificationCodeController extends Controller
{
    /**
     * Issues this registration a fresh verification code.
     *
     * Every ID card already printed carries the old one, so those cards stop
     * matching the page their QR opens — which is the point: it is how an
     * organizer retires a badge that was lost, copied, or printed by mistake
     * without cancelling the registration behind it.
     */
    public function update(Event $event, Registration $registration)
    {
        abort_unless($registration->event_id === $event->id, 404);

        $code = $registration->rotateVerificationCode();

        return back()->with(['toast' => [
            'title' => 'New code issued',
            'description' => "{$registration->name}'s card now verifies as {$code}. Cards printed with the old code no longer match — reprint them.",
        ]]);
    }
}
