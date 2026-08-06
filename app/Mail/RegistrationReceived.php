<?php

namespace App\Mail;

use App\Models\Registration;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class RegistrationReceived extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    public function __construct(public readonly Registration $registration)
    {
        // The registration row (and its quota reservation) is only guaranteed
        // durable once the enclosing transaction commits — queueing before
        // that could send a notification for a registration that then rolls back.
        $this->afterCommit();
    }

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: "New registration — {$this->registration->registrationCategory->name}",
        );
    }

    public function content(): Content
    {
        return new Content(
            markdown: 'emails.registration-received',
            with: ['registration' => $this->registration],
        );
    }
}
