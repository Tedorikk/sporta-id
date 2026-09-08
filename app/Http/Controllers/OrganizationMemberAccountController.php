<?php

namespace App\Http\Controllers;

use App\Concerns\PasswordValidationRules;
use App\Concerns\ProfileValidationRules;
use App\Models\Organization;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

/**
 * Creates a brand new account and drops it straight into an organization.
 *
 * OrganizationMemberController only attaches people who already signed
 * themselves up. Staff, volunteers and operators are handed their access by a
 * manager instead, so the account has to be created on their behalf.
 */
class OrganizationMemberAccountController extends Controller
{
    use PasswordValidationRules, ProfileValidationRules;

    public function store(Request $request, Organization $organization): RedirectResponse
    {
        Gate::authorize('createMemberAccount', $organization);

        $validated = $request->validate([
            ...$this->profileRules(),
            'password' => $this->passwordRules(),
            'role' => ['required', Rule::in(Organization::ROLES)],
        ]);

        if ($validated['role'] === Organization::ROLE_OWNER
            && ! $request->user()->hasOrganizationRole($organization, [Organization::ROLE_OWNER])) {
            throw ValidationException::withMessages([
                'role' => 'Only an owner can grant the owner role.',
            ]);
        }

        $user = DB::transaction(function () use ($validated, $organization) {
            $user = User::create([
                'name' => $validated['name'],
                'email' => $validated['email'],
                'password' => $validated['password'],
            ]);

            $organization->users()->attach($user, ['role' => $validated['role']]);

            // A manager vouched for this address and the account holder never
            // asked for it, so there is no verification mail they would think
            // to act on. Verifying here keeps them out of the `verified`
            // middleware's redirect loop on first sign-in.
            $user->forceFill([
                'email_verified_at' => now(),
                'current_organization_id' => $organization->id,
            ])->save();

            return $user;
        });

        return back()->with(['toast' => [
            'title' => 'Success',
            'description' => "{$user->name}'s account was created and added to {$organization->name}.",
        ]]);
    }
}
