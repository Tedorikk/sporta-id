<?php

namespace App\Http\Controllers;

use App\Concerns\PasswordValidationRules;
use App\Concerns\ProfileValidationRules;
use App\Models\OrganizationInvitation;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rules\Password;
use Inertia\Inertia;
use Inertia\Response;

/**
 * The public half of the invitation flow: the invitee opens their link, and
 * either signs up on the spot or, if the address already has an account,
 * confirms while signed in as it.
 */
class InvitationAcceptanceController extends Controller
{
    use PasswordValidationRules, ProfileValidationRules;

    public function show(Request $request, string $token): Response
    {
        $invitation = OrganizationInvitation::with('organization')
            ->where('token', $token)
            ->firstOrFail();

        return Inertia::render('auth/accept-invitation', [
            'token' => $token,
            'email' => $invitation->email,
            'role' => $invitation->role,
            'organization' => $invitation->organization->only(['id', 'name']),
            'state' => $this->state($request, $invitation),
            'passwordRules' => Password::defaults()->toPasswordRulesString(),
        ]);
    }

    public function store(Request $request, string $token): RedirectResponse
    {
        $invitation = OrganizationInvitation::with('organization')
            ->where('token', $token)
            ->firstOrFail();

        $state = $this->state($request, $invitation);

        // Only the two states that offer a submit button may be posted to. Any
        // other state means the link went stale between render and submit.
        abort_unless(in_array($state, ['register', 'ready'], true), 403);

        $user = $state === 'ready'
            ? $request->user()
            : $this->createInvitedUser($request, $invitation);

        DB::transaction(function () use ($invitation, $user) {
            if (! $user->fresh()->belongsToOrganization($invitation->organization)) {
                $invitation->organization->users()->attach($user, ['role' => $invitation->role]);
            }

            $invitation->forceFill(['accepted_at' => now()])->save();

            $user->forceFill(['current_organization_id' => $invitation->organization_id])->save();
        });

        return redirect()->route('events.index');
    }

    private function createInvitedUser(Request $request, OrganizationInvitation $invitation): User
    {
        $validated = $request->validate([
            'name' => $this->nameRules(),
            'password' => $this->passwordRules(),
        ]);

        $user = User::create([
            'name' => $validated['name'],
            'email' => $invitation->email,
            'password' => $validated['password'],
        ]);

        // Reaching this point proves control of the address: the token only
        // ever went there.
        $user->forceFill(['email_verified_at' => now()])->save();

        Auth::login($user);
        $request->session()->regenerate();

        return $user;
    }

    /**
     * Which of the invitation screens the visitor should see.
     *
     * - accepted / expired: the link is spent, nothing to do
     * - wrong_account: signed in as someone the invitation is not addressed to
     * - needs_login: the address already has an account, so prove it first
     * - ready: signed in as the invitee, one click from joining
     * - register: no account yet, pick a name and password
     */
    private function state(Request $request, OrganizationInvitation $invitation): string
    {
        if ($invitation->isAccepted()) {
            return 'accepted';
        }

        if ($invitation->isExpired()) {
            return 'expired';
        }

        $signedIn = $request->user();

        if ($signedIn !== null) {
            return $signedIn->email === $invitation->email ? 'ready' : 'wrong_account';
        }

        return User::where('email', $invitation->email)->exists() ? 'needs_login' : 'register';
    }
}
