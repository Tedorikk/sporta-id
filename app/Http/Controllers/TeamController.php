<?php

namespace App\Http\Controllers;

use App\Models\BasketballClub;
use App\Models\BasketballEvent;
use App\Models\Event;
use App\Models\Registration;
use App\Models\Team;
use App\Services\TeamReviewService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Symfony\Component\HttpFoundation\StreamedResponse;

class TeamController extends Controller
{
    public function __construct(private readonly TeamReviewService $teamReviewService) {}

    public function index(Request $request, Event $event)
    {
        $filters = $request->only(['search', 'category', 'status']);

        $teams = $event->teams()
            ->with(['basketballEventCategory', 'players'])
            ->when($filters['search'] ?? null, fn ($q, $search) => $q->where('name', 'like', "%{$search}%"))
            ->when($filters['category'] ?? null, fn ($q, $categoryId) => $q->where('basketball_event_category_id', $categoryId))
            ->when($filters['status'] ?? null, fn ($q, $status) => $q->where('status', $status))
            ->latest()
            ->paginate(10)
            ->withQueryString();

        $teams->getCollection()->transform(function (Team $team) {
            $team->setAttribute('review_summary', $this->teamReviewService->review($team)['summary']);

            return $team;
        });

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

        DB::transaction(function () use ($event, $validated) {
            $team = $event->teams()->create($validated);

            $this->registerTeam($team);
        });

        return redirect()->route('teams.index', $event)->with(['toast' => [
            'title' => 'Success',
            'description' => 'Team added successfully.',
        ]]);
    }

    /**
     * An organiser adding a team by hand is entering it the same way a captain
     * would through the public form, so it gets the same registration record:
     * confirmed, holding a quota slot, with a portal token for its roster.
     */
    private function registerTeam(Team $team): void
    {
        $registrationCategory = $team->basketballEventCategory?->registrationCategory;

        if ($registrationCategory === null) {
            return;
        }

        Registration::create([
            'registration_category_id' => $registrationCategory->id,
            'event_id' => $team->event_id,
            'team_id' => $team->id,
            'name' => $team->name,
            'form_data' => [],
            'status' => Registration::STATUS_CONFIRMED,
        ]);

        $registrationCategory->increment('registered_count');
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
        abort_unless($team->event_id === $event->id, 404);

        $validated = $this->validated($request, $event, $team);

        DB::transaction(function () use ($team, $validated) {
            $team->update($validated);

            // The registration is the team's entry ticket; keep the name it
            // shows on lists and ID cards in step with the team.
            $team->registration()->update(['name' => $team->name]);
        });

        return redirect()->route('teams.index', $event)->with(['toast' => [
            'title' => 'Success',
            'description' => 'Team updated successfully.',
        ]]);
    }

    public function destroy(Event $event, Team $team)
    {
        abort_unless($team->event_id === $event->id, 404);

        DB::transaction(function () use ($team) {
            $registration = $team->registration;

            // Keep the registration (and any payment on it) as a record, but
            // release the slot it was holding.
            if ($registration !== null && ! $registration->isWithdrawn()) {
                $registration->update(['status' => Registration::STATUS_CANCELLED]);
                $registration->registrationCategory()->decrement('registered_count');
            }

            $team->delete();
        });

        return redirect()->route('teams.index', $event)->with(['toast' => [
            'title' => 'Success',
            'description' => 'Team deleted successfully.',
        ]]);
    }

    public function show(Event $event, Team $team)
    {
        abort_unless($team->event_id === $event->id, 404);

        $team->load('players', 'basketballEventCategory', 'registration');
        $clubs = BasketballClub::with('player')->orderBy('name')->get();

        return Inertia::render('dashboard/events/basketball/teams/show', [
            'event' => $event,
            'team' => $team,
            'clubs' => $clubs,
            'review' => $this->teamReviewService->review($team),
            // The captain's self-service roster page, for organisers to pass on.
            'rosterUrl' => $team->registration !== null && $team->basketballEventCategory !== null
                ? route('team-roster.show', $team->registration)
                : null,
        ]);
    }

    public function exportReview(Event $event, Team $team): StreamedResponse
    {
        abort_unless($team->event_id === $event->id, 404);

        $team->load('players');
        $rows = $this->teamReviewService->exportRows(collect([$team]));

        return $this->streamReviewCsv(Str::slug($team->name).'-review-issues.csv', $rows);
    }

    public function exportReviewAll(Event $event): StreamedResponse
    {
        $teams = $event->teams()->with('players')->get();
        $rows = $this->teamReviewService->exportRows($teams);

        return $this->streamReviewCsv(Str::slug($event->name).'-review-issues.csv', $rows);
    }

    private function streamReviewCsv(string $filename, array $rows): StreamedResponse
    {
        return response()->streamDownload(function () use ($rows) {
            $out = fopen('php://output', 'w');
            fputcsv($out, ['Team', 'Member', 'Role', 'Severity', 'Issue']);

            foreach ($rows as $row) {
                fputcsv($out, [$row['team'], $row['member'], $row['role'], $row['severity'], $row['issue']]);
            }

            fclose($out);
        }, $filename, ['Content-Type' => 'text/csv']);
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
            'status' => ['required', Rule::in(Team::STATUSES)],
            'basketball_event_category_id' => [
                'nullable',
                Rule::exists('basketball_event_categories', 'id')
                    ->where('basketball_event_id', $event->specific?->getKey()),
            ],
        ]);
    }
}
