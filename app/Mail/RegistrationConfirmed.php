<?php

namespace App\Mail;

use App\Models\Payment;
use App\Models\Registration;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

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
            subject: __('You’re registered — :event', ['event' => $this->registration->event->name]),
        );
    }

    public function content(): Content
    {
        $payment = $this->registration->payments()
            ->where('status', Payment::STATUS_SETTLEMENT)
            ->latest('paid_at')
            ->first();

        return new Content(
            markdown: 'emails.registration-confirmed',
            with: [
                'registration' => $this->registration,
                'payment' => $payment,
            ],
        );
    }
}
