<?php

namespace App\Http\Controllers;

use App\Models\Event;
use App\Models\Registration;
use App\Services\RegistrationConfirmationNotifier;

class RegistrationConfirmationEmailController extends Controller
{
    public function __construct(private readonly RegistrationConfirmationNotifier $notifier) {}

    public function store(Event $event, Registration $registration)
    {
        abort_unless($registration->event_id === $event->id, 404);
        abort_unless($registration->status === Registration::STATUS_CONFIRMED, 422, 'Only confirmed registrations can receive confirmation emails.');
        abort_if(blank($registration->email), 422, 'This registration does not have an email address.');

        $this->notifier->resendRegistrant($registration);

        return back()->with(['toast' => [
            'title' => 'Email queued',
            'description' => 'The confirmation email was resent.',
        ]]);
    }
}
