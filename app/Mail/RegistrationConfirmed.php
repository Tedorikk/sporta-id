<?php

namespace App\Mail;

use App\Models\Payment;
use App\Models\Registration;
use App\Services\Basketball\RosterService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Str;

/**
 * Sent to the registrant once their registration is confirmed — immediately
 * for a free category, or after Midtrans reports settlement for a paid one.
 * Doubles as the payment receipt, since it carries the order id and amount.
 */
class RegistrationConfirmed extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    public function __construct(public readonly Registration $registration)
    {
        // The confirmation (and, for a paid registration, the settled payment)
        // is only durable once the enclosing transaction commits.
        $this->afterCommit();
    }

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: $this->confirmationEmailSubject(),
        );
    }

    public function content(): Content
    {
        $payment = $this->registration->payments()
            ->where('status', Payment::STATUS_SETTLEMENT)
            ->latest('paid_at')
            ->first();

        $team = $this->registration->team;
        $tournamentTeam = $team?->basketballEventCategory !== null;

        return new Content(
            markdown: 'emails.registration-confirmed',
            with: [
                'registration' => $this->registration,
                'payment' => $payment,
                'confirmationEmailBody' => $this->confirmationEmailBody(),
                // A team sheet that still needs work — members missing, or
                // registered without their details — and by when.
                'rosterIncomplete' => $tournamentTeam && ! app(RosterService::class)->summary($team)['complete'],
                'rosterClosesAt' => $tournamentTeam ? $this->registration->registrationCategory->rosterClosesAt() : null,
                // Whether the category uses the non-basketball "Organize
                // Members" block instead of the roster block.
                'teamMembersField' => $this->registration->registrationCategory->teamMembersField(),
            ],
        );
    }

    private function confirmationEmailSubject(): string
    {
        $subject = $this->registration->registrationCategory->form_settings['confirmation_email_subject'] ?? null;

        if (blank($subject)) {
            return __('You’re registered — :event', ['event' => $this->registration->event->name]);
        }

        return $this->replacePlaceholders($subject);
    }

    private function confirmationEmailBody(): ?string
    {
        $body = $this->registration->registrationCategory->form_settings['confirmation_email_body'] ?? null;

        if (blank($body)) {
            return null;
        }

        return $this->replacePlaceholders($body);
    }

    private function replacePlaceholders(string $value): string
    {
        return Str::of($value)->replace(array_keys($this->placeholderValues()), array_values($this->placeholderValues()))->toString();
    }

    /** @return array<string, string> */
    private function placeholderValues(): array
    {
        $event = $this->registration->event;
        $category = $this->registration->registrationCategory;
        $eventDates = $event->start_date?->translatedFormat('j M Y') ?? '';

        if ($event->end_date && $event->start_date && $event->end_date->ne($event->start_date)) {
            $eventDates .= ' – '.$event->end_date->translatedFormat('j M Y');
        }

        return [
            '{name}' => $this->registration->name,
            '{event}' => $event->name,
            '{category}' => $category->name,
            '{event_dates}' => $eventDates,
            '{id_card_url}' => $this->registration->team
                ? route('teams.id-card', $this->registration->team)
                : route('registrations.id-card', $this->registration),
            '{status_url}' => route('registrations.status', $this->registration),
        ];
    }
}
