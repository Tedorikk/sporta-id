<?php

namespace App\Http\Controllers;

use App\Mail\OrganizationInvitation as OrganizationInvitationMail;
use App\Models\Organization;
use App\Models\OrganizationInvitation;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Mail;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

/**
 * Invites someone into an organization by email, so they set their own
 * password instead of being handed one. The counterpart to
 * OrganizationMemberAccountController, which creates the account outright.
 */
class OrganizationInvitationController extends Controller
{
    public function store(Request $request, Organization $organization): RedirectResponse
    {
        Gate::authorize('inviteMember', $organization);

        $validated = $request->validate([
            'email' => ['required', 'string', 'email', 'max:255'],
            'role' => ['required', Rule::in(Organization::ROLES)],
        ]);

        if ($validated['role'] === Organization::ROLE_OWNER
            && ! $request->user()->hasOrganizationRole($organization, [Organization::ROLE_OWNER])) {
            throw ValidationException::withMessages([
                'role' => 'Only an owner can grant the owner role.',
            ]);
        }

        $existing = User::where('email', $validated['email'])->first();

        if ($existing?->belongsToOrganization($organization)) {
            throw ValidationException::withMessages([
                'email' => 'That person is already a member of this organization.',
            ]);
        }

        // Re-inviting the same address replaces the outstanding offer rather
        // than stacking a second one, so the newest link is the only live one.
        $organization->invitations()->where('email', $validated['email'])->pending()->delete();

        $invitation = $organization->invitations()->create([
            'email' => $validated['email'],
            'role' => $validated['role'],
            'token' => OrganizationInvitation::freshToken(),
            'invited_by_id' => $request->user()->id,
            'expires_at' => OrganizationInvitation::defaultExpiry(),
        ]);

        $delivered = $this->deliver($invitation);

        return back()->with(['toast' => [
            'title' => $delivered ? 'Invitation sent' : 'Invitation created',
            'description' => $delivered
                ? "An invitation was emailed to {$invitation->email}."
                : "The invitation could not be emailed. Copy the link and send it to {$invitation->email} yourself.",
        ]]);
    }

    public function destroy(Organization $organization, OrganizationInvitation $invitation): RedirectResponse
    {
        Gate::authorize('revokeInvitation', $organization);

        abort_unless($invitation->organization_id === $organization->id, 404);

        $invitation->delete();

        return back()->with(['toast' => [
            'title' => 'Invitation revoked',
            'description' => "The invitation to {$invitation->email} is no longer valid.",
        ]]);
    }

    /**
     * The mailable is queued, so this only catches a failure to hand it to the
     * queue; a bad address or an SMTP outage surfaces in the worker instead.
     * Either way the invitation row is already saved and the manager can copy
     * the link, so a failure here is reported rather than thrown.
     */
    private function deliver(OrganizationInvitation $invitation): bool
    {
        try {
            Mail::to($invitation->email)->send(new OrganizationInvitationMail($invitation));

            return true;
        } catch (\Throwable $e) {
            report($e);

            return false;
        }
    }
}
