<?php

namespace App\Http\Controllers;

use App\Models\BasketballEventCategory;
use App\Models\Event;
use App\Models\GameMatch;
use App\Models\Pool;
use App\Services\Basketball\BracketService;
use App\Services\Basketball\RoundRobinService;
use App\Services\Basketball\StandingsService;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Illuminate\Validation\Rule;

class GameMatchController extends Controller
{
    public function __construct(
        protected RoundRobinService $roundRobin,
        protected BracketService $bracket,
        protected StandingsService $standings,
    ) {}

    /**
     * List all matches for a category, grouped by round.
     */
    public function index(Event $event, BasketballEventCategory $category)
    {
        $matches = $category->matches()
            ->with(['homeTeam', 'awayTeam', 'pool'])
            ->orderBy('round')
            ->orderBy('match_number')
            ->orderBy('scheduled_at')
            ->get();

        $groupMatches = $matches->where('round', 'group')->groupBy(fn ($m) => $m->pool_id ?? 'ungrouped');
        $bracketMatches = $matches->where('round', '!=', 'group')->groupBy('round');

        $pools = $category->pools()->with('teams')->get();

        $standings = $pools->mapWithKeys(function (Pool $pool) {
            return [$pool->id => $this->standings->forPool($pool)];
        });

        return Inertia::render('dashboard/events/basketball/matches/index', [
            'event' => $event,
            'category' => $category,
            'pools' => $pools,
            'teams' => $category->teams()->orderBy('name')->get(),
            'groupMatches' => $groupMatches,
            'bracketMatches' => $bracketMatches,
            'standings' => $standings,
        ]);
    }

    /**
     * Generate round-robin matches for the entire category (round_robin format).
     */
    public function generate(Request $request, Event $event, BasketballEventCategory $category)
    {
        $teams = $category->teams;

        if ($teams->count() < 2) {
            return back()->withErrors(['error' => 'Kategori ini memerlukan minimal 2 tim untuk membuat jadwal.']);
        }

        $this->roundRobin->generateForCategory($category, $teams);

        return back()->with(['toast' => [
            'title' => 'Sukses',
            'description' => 'Jadwal pertandingan round robin berhasil dibuat.',
        ]]);
    }

    /**
     * Generate round-robin matches for a specific pool (pool_stage format).
     */
    public function generateForPool(Request $request, Event $event, BasketballEventCategory $category, Pool $pool)
    {
        if ($pool->teams()->count() < 2) {
            return back()->withErrors(['error' => "Pool {$pool->name} memerlukan minimal 2 tim."]);
        }

        $this->roundRobin->generateForPool($pool);

        return back()->with(['toast' => [
            'title' => 'Sukses',
            'description' => "Jadwal pool {$pool->name} berhasil dibuat.",
        ]]);
    }

    /**
     * Update the score of a match and advance bracket winner if applicable.
     */
    public function updateScore(Request $request, Event $event, BasketballEventCategory $category, GameMatch $match)
    {
        $validated = $request->validate([
            'home_score' => 'required|integer|min:0',
            'away_score' => 'required|integer|min:0',
            'status' => 'required|in:scheduled,ongoing,finished',
        ]);

        $match->update($validated);

        // Advance winner in knockout bracket
        if ($validated['status'] === 'finished' && $match->round !== 'group') {
            $this->bracket->advanceWinner($match);
        }

        return back()->with(['toast' => [
            'title' => 'Sukses',
            'description' => 'Skor pertandingan berhasil diperbarui.',
        ]]);
    }

    /**
     * Show a single match detail.
     */
    public function show(Event $event, BasketballEventCategory $category, GameMatch $match)
    {
        $match->load(['homeTeam', 'awayTeam', 'pool']);

        return Inertia::render('dashboard/events/basketball/matches/show', [
            'event' => $event,
            'category' => $category,
            'match' => $match,
        ]);
    }

    /**
     * Delete a single match.
     */
    public function destroy(Event $event, BasketballEventCategory $category, GameMatch $match)
    {
        $match->delete();

        return back()->with(['toast' => [
            'title' => 'Sukses',
            'description' => 'Pertandingan berhasil dihapus.',
        ]]);
    }

    /**
     * Yes, storing, as the name said 
     */
    public function store(
        Request $request,
        Event $event,
        BasketballEventCategory $category
    ) {
        $validated = $request->validate([
            'home_team_id' => [
                'required',
                Rule::exists('teams', 'id'),
            ],

            'away_team_id' => [
                'required',
                'different:home_team_id',
                Rule::exists('teams', 'id'),
            ],

            'pool_id' => [
                'nullable',
                Rule::exists('pools', 'id'),
            ],

            'round' => [
                'required',
                'string',
            ],

            'match_number' => [
                'nullable',
                'integer',
            ],

            'scheduled_at' => [
                'nullable',
                'date',
            ],
        ]);

        // Ensure teams belong to this category
        $teamIds = $category->teams()->pluck('teams.id');

        abort_unless(
            $teamIds->contains($validated['home_team_id']) &&
            $teamIds->contains($validated['away_team_id']),
            422,
            'Selected teams are not in this category.'
        );

        if (! empty($validated['pool_id'])) {

            $pool = $category
                ->pools()
                ->findOrFail($validated['pool_id']);

            $poolTeamIds = $pool->teams()->pluck('teams.id');

            abort_unless(
                $poolTeamIds->contains($validated['home_team_id']) &&
                $poolTeamIds->contains($validated['away_team_id']),
                422,
                'Both teams must belong to the selected pool.'
            );
        }

        if ($validated['pool_id']) {
            $pool = $category
                ->pools()
                ->findOrFail($validated['pool_id']);

            $poolTeamIds = $pool
                ->teams()
                ->pluck('teams.id');

            abort_unless(
                $poolTeamIds->contains($validated['home_team_id']) &&
                $poolTeamIds->contains($validated['away_team_id']),
                422,
                'Both teams must belong to the selected pool.'
            );
        }

        $exists = GameMatch::query()
            ->where('basketball_event_category_id', $category->id)
            ->where('round', $validated['round'])
            ->where('pool_id', $validated['pool_id'])
            ->where(function ($q) use ($validated) {
                $q->where(function ($q) use ($validated) {
                    $q->where('home_team_id', $validated['home_team_id'])
                    ->where('away_team_id', $validated['away_team_id']);
                })->orWhere(function ($q) use ($validated) {
                    $q->where('home_team_id', $validated['away_team_id'])
                    ->where('away_team_id', $validated['home_team_id']);
                });
            })
            ->exists();

        abort_if(
            $exists,
            422,
            'This match already exists.'
        );

        GameMatch::create([
            'basketball_event_category_id' => $category->id,
            'pool_id' => $validated['pool_id'],
            'home_team_id' => $validated['home_team_id'],
            'away_team_id' => $validated['away_team_id'],
            'round' => $validated['round'],
            'match_number' => $validated['match_number'],
            'scheduled_at' => $validated['scheduled_at'],
            'status' => 'scheduled',
        ]);

        return back()->with('toast', [
            'title' => 'Success',
            'description' => 'Match created successfully.',
        ]);
    }
}
