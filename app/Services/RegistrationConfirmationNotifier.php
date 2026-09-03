<?php

namespace App\Services;

use App\Mail\RegistrationConfirmed;
use App\Mail\RegistrationReceived;
use App\Models\Registration;
use Illuminate\Support\Facades\Mail;

/**
 * Everything that has to go out when a registration becomes confirmed.
 *
 * Confirmation happens in two unrelated places — immediately for a free
 * category, and later from the Midtrans webhook for a paid one — and the
 * paid path used to notify nobody at all. Both now call this.
 */
class RegistrationConfirmationNotifier
{
    public function notify(Registration $registration): void
    {
        $registration->loadMissing(['registrationCategory', 'event']);

        $this->mailRegistrant($registration);
        $this->mailOrganizers($registration);
    }

    /**
     * The person who registered (and, for a paid category, paid) gets a
     * confirmation with their ID card link. Email is mandatory on paid
     * categories, but a free one may not collect it at all.
     */
    private function mailRegistrant(Registration $registration): void
    {
        if (blank($registration->email)) {
            return;
        }

        $this->send($registration->email, new RegistrationConfirmed($registration));
    }

    private function mailOrganizers(Registration $registration): void
    {
        $recipients = $registration->registrationCategory->form_settings['notify_emails'] ?? [];

        foreach ($recipients as $recipient) {
            $this->send($recipient, new RegistrationReceived($registration));
        }
    }

    /**
     * A bad address or a mail outage must never roll back a payment that has
     * already settled, so delivery failures are reported and swallowed.
     */
    private function send(string $recipient, RegistrationConfirmed|RegistrationReceived $mailable): void
    {
        try {
            Mail::to($recipient)->send($mailable);
        } catch (\Throwable $e) {
            report($e);
        }
    }
}
