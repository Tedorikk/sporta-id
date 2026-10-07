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

        $this->mailRegistrant($registration, recordStatus: true);
        $this->mailOrganizers($registration);
    }

    public function resendRegistrant(Registration $registration): bool
    {
        $registration->loadMissing(['registrationCategory', 'event']);

        return $this->mailRegistrant($registration, recordStatus: true);
    }

    /**
     * The person who registered (and, for a paid category, paid) gets a
     * confirmation with their ID card link. Email is mandatory on paid
     * categories, but a free one may not collect it at all.
     */
    private function mailRegistrant(Registration $registration, bool $recordStatus = false): bool
    {
        if (blank($registration->email)) {
            return false;
        }

        // The registrant's own language, not the request's: the webhook that
        // confirms a paid registration has no request at all.
        return $this->send(
            $registration->email,
            (new RegistrationConfirmed($registration))->locale($registration->locale ?? 'id'),
            $recordStatus ? $registration : null,
        );
    }

    private function mailOrganizers(Registration $registration): void
    {
        $recipients = $registration->registrationCategory->form_settings['notify_emails'] ?? [];

        // Organisers work in the English dashboard, whatever the registrant chose.
        foreach ($recipients as $recipient) {
            $this->send($recipient, (new RegistrationReceived($registration))->locale('en'));
        }
    }

    /**
     * A bad address or a mail outage must never roll back a payment that has
     * already settled, so delivery failures are reported and swallowed.
     */
    private function send(string $recipient, RegistrationConfirmed|RegistrationReceived $mailable, ?Registration $registration = null): bool
    {
        try {
            Mail::to($recipient)->send($mailable);

            $registration?->forceFill([
                'confirmation_email_sent_at' => now(),
                'confirmation_email_failed_at' => null,
                'confirmation_email_failure' => null,
            ])->save();

            return true;
        } catch (\Throwable $e) {
            $registration?->forceFill([
                'confirmation_email_failed_at' => now(),
                'confirmation_email_failure' => str($e->getMessage())->limit(1000)->toString(),
            ])->save();

            report($e);

            return false;
        }
    }
}
