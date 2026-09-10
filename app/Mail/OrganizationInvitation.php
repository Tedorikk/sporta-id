<?php

namespace App\Mail;

use App\Models\OrganizationInvitation as Invitation;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

/**
 * Carries the accept link to someone who has been invited into an
 * organization. They may not have an account yet, so this is addressed to a
 * bare email rather than a notifiable user.
 */
class OrganizationInvitation extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    public function __construct(public readonly Invitation $invitation)
    {
        // The token has to be readable by the queue worker, which only sees
        // committed rows.
        $this->afterCommit();
    }

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: "You've been invited to join {$this->invitation->organization->name}",
        );
    }

    public function content(): Content
    {
        return new Content(
            markdown: 'emails.organization-invitation',
            with: [
                'invitation' => $this->invitation,
                'organization' => $this->invitation->organization,
                'inviter' => $this->invitation->invitedBy,
                'url' => $this->invitation->url(),
            ],
        );
    }
}
