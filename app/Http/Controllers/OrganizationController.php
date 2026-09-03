<?php

namespace App\Http\Controllers;

use App\Models\Organization;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;
use Inertia\Response;

class OrganizationController extends Controller
{
    public function index(Request $request): Response
    {
        $user = $request->user();

        $organizations = $user->organizations()
            ->withCount('events')
            ->orderBy('name')
            ->get()
            ->map(fn (Organization $organization) => [
                'id' => $organization->id,
                'name' => $organization->name,
                'slug' => $organization->slug,
                'role' => $organization->getAttribute('pivot')->role,
                'events_count' => $organization->events_count,
                'is_current' => $organization->id === $user->current_organization_id,
            ]);

        return Inertia::render('dashboard/organizations/index', [
            'organizations' => $organizations,
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'min:2', 'max:255'],
        ]);

        $organization = Organization::create($validated);
        $organization->users()->attach($request->user(), ['role' => Organization::ROLE_OWNER]);

        $request->user()->switchOrganization($organization);

        return redirect()->route('events.index')->with(['toast' => [
            'title' => 'Success',
            'description' => "You are now working in {$organization->name}.",
        ]]);
    }

    public function update(Request $request, Organization $organization): RedirectResponse
    {
        Gate::authorize('update', $organization);

        $organization->update($request->validate([
            'name' => ['required', 'string', 'min:2', 'max:255'],
        ]));

        return back()->with(['toast' => [
            'title' => 'Success',
            'description' => 'Organization updated successfully.',
        ]]);
    }

    public function destroy(Request $request, Organization $organization): RedirectResponse
    {
        Gate::authorize('delete', $organization);

        // Events cascade with the organization, so make the blast radius explicit.
        if ($organization->events()->exists()) {
            return back()->with(['toast' => [
                'title' => 'Error',
                'description' => 'Delete this organization\'s events before deleting the organization.',
            ]]);
        }

        $organization->delete();

        $request->user()->unsetRelation('organizations')->resolveCurrentOrganization();

        return redirect()->route('organizations.index')->with(['toast' => [
            'title' => 'Success',
            'description' => 'Organization deleted successfully.',
        ]]);
    }
}
