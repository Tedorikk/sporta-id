<?php

namespace App\Http\Controllers;

use App\Models\Organization;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;

class OrganizationSwitchController extends Controller
{
    public function update(Request $request, Organization $organization): RedirectResponse
    {
        Gate::authorize('view', $organization);

        $request->user()->switchOrganization($organization);

        return redirect()->route('events.index')->with(['toast' => [
            'title' => 'Success',
            'description' => "You are now working in {$organization->name}.",
        ]]);
    }
}
