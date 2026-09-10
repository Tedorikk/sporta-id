<?php

namespace App\Http\Controllers;

use App\Models\Organization;
use App\Models\OrganizationInvitation;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class OrganizationMemberController extends Controller
{
    public function index(Request $request, Organization $organization): Response
    {
        Gate::authorize('viewMembers', $organization);

        return Inertia::render('dashboard/organizations/members', [
            'organization' => $organization->only(['id', 'name', 'slug']),
            'canManage' => $request->user()->hasOrganizationRole($organization, Organization::MANAGER_ROLES),
            'isOwner' => $request->user()->hasOrganizationRole($organization, [Organization::ROLE_OWNER]),
            'members' => $organization->users()->orderBy('name')->get()
                ->map(fn ($member) => [
                    'id' => $member->id,
                    'name' => $member->name,
                    'email' => $member->email,
                    'role' => $member->getAttribute('pivot')->role,
                    'is_self' => $member->id === $request->user()->id,
                ]),
            'roles' => Organization::ROLES,
            // Only managers may invite, so only they are shown the outstanding
            // offers — and the link, which is a credential of sorts.
            'invitations' => $request->user()->hasOrganizationRole($organization, Organization::MANAGER_ROLES)
                ? $organization->invitations()->pending()->latest()->get()
                    ->map(fn (OrganizationInvitation $invitation) => [
                        'id' => $invitation->id,
                        'email' => $invitation->email,
                        'role' => $invitation->role,
                        'url' => $invitation->url(),
                        'expires_at' => $invitation->expires_at->toIso8601String(),
                    ])
                : [],
        ]);
    }

    public function store(Request $request, Organization $organization): RedirectResponse
    {
        Gate::authorize('addMember', $organization);

        $validated = $request->validate([
            'email' => ['required', 'email', Rule::exists('users', 'email')],
            'role' => ['required', Rule::in(Organization::ROLES)],
        ], [
            'email.exists' => 'No account exists with that email address. Ask them to sign up first.',
        ]);

        if ($validated['role'] === Organization::ROLE_OWNER
            && ! $request->user()->hasOrganizationRole($organization, [Organization::ROLE_OWNER])) {
            throw ValidationException::withMessages([
                'role' => 'Only an owner can grant the owner role.',
            ]);
        }

        $user = User::where('email', $validated['email'])->firstOrFail();

        if ($user->belongsToOrganization($organization)) {
            throw ValidationException::withMessages([
                'email' => 'That person is already a member of this organization.',
            ]);
        }

        $organization->users()->attach($user, ['role' => $validated['role']]);

        return back()->with(['toast' => [
            'title' => 'Success',
            'description' => "{$user->name} was added to {$organization->name}.",
        ]]);
    }

    public function update(Request $request, Organization $organization, User $user): RedirectResponse
    {
        $validated = $request->validate([
            'role' => ['required', Rule::in(Organization::ROLES)],
        ]);

        Gate::authorize('updateMember', [$organization, $user, $validated['role']]);

        $organization->users()->updateExistingPivot($user, ['role' => $validated['role']]);

        return back()->with(['toast' => [
            'title' => 'Success',
            'description' => "{$user->name} is now a {$validated['role']}.",
        ]]);
    }

    public function destroy(Request $request, Organization $organization, User $user): RedirectResponse
    {
        Gate::authorize('removeMember', [$organization, $user]);

        $organization->users()->detach($user);

        // The removed member may have been working in this organization. The
        // relation was loaded during authorization, so drop it before resolving.
        $user->unsetRelation('organizations')->resolveCurrentOrganization();

        return back()->with(['toast' => [
            'title' => 'Success',
            'description' => "{$user->name} was removed from {$organization->name}.",
        ]]);
    }
}
