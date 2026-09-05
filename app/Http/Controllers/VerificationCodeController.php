<?php

namespace App\Http\Controllers;

use App\Models\Attendee;
use App\Models\Event;
use App\Models\Registration;

class VerificationCodeController extends Controller
{
    /**
     * Issues a cardholder a fresh verification code.
     *
     * Every ID card already printed carries the old one, so those cards stop
     * matching the page their QR opens — which is the point: it is how an
     * organizer retires a badge that was lost, copied, or printed by mistake
     * without cancelling the person's registration or pass.
     */
    public function registration(Event $event, Registration $registration)
    {
        abort_unless($registration->event_id === $event->id, 404);

        return $this->rotated($registration->rotateVerificationCode(), $registration->name);
    }

    public function attendee(Event $event, Attendee $attendee)
    {
        abort_unless($attendee->event_id === $event->id, 404);

        return $this->rotated($attendee->rotateVerificationCode(), $attendee->name);
    }

    private function rotated(string $code, string $name)
    {
        return back()->with(['toast' => [
            'title' => 'New code issued',
            'description' => "{$name}'s card now verifies as {$code}. Cards printed with the old code no longer match — reprint them.",
        ]]);
    }
}
