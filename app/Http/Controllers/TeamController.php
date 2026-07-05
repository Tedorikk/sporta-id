<?php

namespace App\Http\Controllers;

use App\Models\Event;
use App\Models\Team;
use Illuminate\Http\Request;
use Inertia\Inertia;

class TeamController extends Controller
{
    public function index(Request $request, Event $event)
    {
        $search = $request->input('search');

        $teams = $event->teams()
            ->when($search, fn ($q) => $q->where('name', 'like', "%{$search}%"))
            ->latest()
            ->paginate(10)
            ->withQueryString();

        return Inertia::render('dashboard/events/teams/index', [
            'event' => $event,
            'teams' => $teams,
            'filters' => $request->only(['search']),
        ]);
    }

    public function create(Event $event)
    {
        return Inertia::render('dashboard/events/teams/create', [
            'event' => $event,
        ]);
    }

    public function store(Request $request, Event $event)
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'manager_name' => ['required', 'string', 'max:255'],
            'manager_phone' => ['required', 'string', 'max:20'],
            'logo' => ['nullable', 'url', 'max:255'],
            'status' => ['required', 'in:pending,verified,rejected'],
        ]);

        $event->teams()->create($validated);

        return redirect()->route('teams.index', $event)->with(['toast' => [
            'title' => 'Success',
            'description' => 'Team added successfully.',
        ]]);
    }

    public function edit(Event $event, Team $team)
    {
        return Inertia::render('dashboard/events/teams/edit', [
            'event' => $event,
            'team' => $team,
        ]);
    }

    public function update(Request $request, Event $event, Team $team)
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'manager_name' => ['required', 'string', 'max:255'],
            'manager_phone' => ['required', 'string', 'max:20'],
            'logo' => ['nullable', 'url', 'max:255'],
            'status' => ['required', 'in:pending,verified,rejected'],
        ]);

        $team->update($validated);

        return redirect()->route('teams.index', $event)->with(['toast' => [
            'title' => 'Success',
            'description' => 'Team updated successfully.',
        ]]);
    }

    public function destroy(Event $event, Team $team)
    {
        $team->delete();

        return redirect()->route('teams.index', $event)->with(['toast' => [
            'title' => 'Success',
            'description' => 'Team deleted successfully.',
        ]]);
    }

    public function show(Event $event, Team $team)
    {
        $team->load('players');

        return Inertia::render('dashboard/events/teams/show', [
            'event' => $event,
            'team' => $team,
        ]);
    }
}
