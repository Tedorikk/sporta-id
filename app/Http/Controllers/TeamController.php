<?php

namespace App\Http\Controllers;

use App\Models\BasketballClub;
use App\Models\BasketballEvent;
use App\Models\Event;
use App\Models\Team;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

class TeamController extends Controller
{
    public function index(Request $request, Event $event)
    {
        $filters = $request->only(['search', 'category', 'status']);

        $teams = $event->teams()
            ->with('basketballEventCategory')
            ->when($filters['search'] ?? null, fn ($q, $search) => $q->where('name', 'like', "%{$search}%"))
            ->when($filters['category'] ?? null, fn ($q, $categoryId) => $q->where('basketball_event_category_id', $categoryId))
            ->when($filters['status'] ?? null, fn ($q, $status) => $q->where('status', $status))
            ->latest()
            ->paginate(10)
            ->withQueryString();

        return Inertia::render('dashboard/events/basketball/teams/index', [
            'event' => $event,
            'teams' => $teams,
            'filters' => $filters,
            'categories' => $this->availableCategories($event),
        ]);
    }

    public function create(Event $event)
    {
        $categories = $this->availableCategories($event);

        if (count($categories) === 0) {
            return redirect()->route('teams.index', $event)->with(['toast' => [
                'title' => 'Error',
                'description' => 'Please create at least one event category first.',
            ]]);
        }

        return Inertia::render('dashboard/events/basketball/teams/create', [
            'event' => $event,
            'categories' => $categories,
        ]);
    }

    public function store(Request $request, Event $event)
    {
        $categories = $this->availableCategories($event);

        if (count($categories) === 0) {
            return redirect()->route('teams.index', $event)->with(['toast' => [
                'title' => 'Error',
                'description' => 'Please create at least one event category first.',
            ]]);
        }

        $validated = $this->validated($request, $event);

        $event->teams()->create($validated);

        return redirect()->route('teams.index', $event)->with(['toast' => [
            'title' => 'Success',
            'description' => 'Team added successfully.',
        ]]);
    }

    public function edit(Event $event, Team $team)
    {
        return Inertia::render('dashboard/events/basketball/teams/edit', [
            'event' => $event,
            'team' => $team,
            'categories' => $this->availableCategories($event, $team),
        ]);
    }

    public function update(Request $request, Event $event, Team $team)
    {
        $validated = $this->validated($request, $event, $team);

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
        abort_unless($team->event_id === $event->id, 404);

        $team->load('players', 'basketballEventCategory');
        $clubs = BasketballClub::with('player')->orderBy('name')->get();

        return Inertia::render('dashboard/events/basketball/teams/show', [
            'event' => $event,
            'team' => $team,
            'clubs' => $clubs,
        ]);
    }

    /**
     * Categories belonging to this event's basketball tournament that
     * either have no team yet, or are currently assigned to $team
     * (so editing a team doesn't lock out its own category).
     */
    private function availableCategories(Event $event, ?Team $team = null)
    {
        $event->loadMissing('specific');

        if (! $event->specific instanceof BasketballEvent) {
            return [];
        }

        return $event->specific->categories()->get();
    }

    private function validated(Request $request, Event $event, ?Team $team = null): array
    {
        return $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'logo' => ['nullable', 'url', 'max:255'],
            'status' => ['required', 'in:pending,verified,rejected'],
            'basketball_event_category_id' => [
                'nullable',
                Rule::exists('basketball_event_categories', 'id')
                    ->where('basketball_event_id', $event->specific?->id),
            ],
        ]);
    }
}
