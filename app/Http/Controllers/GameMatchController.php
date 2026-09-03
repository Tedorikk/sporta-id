<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreMatchRequest;
use App\Http\Requests\UpdateMatchScoreRequest;
use App\Models\BasketballEventCategory;
use App\Models\Event;
use App\Models\GameMatch;
use App\Models\Pool;
use App\Services\Basketball\BracketService;
use App\Services\Basketball\MatchService;
use App\Services\Basketball\RoundRobinService;
use App\Services\Basketball\StandingsService;
use Inertia\Inertia;

class GameMatchController extends Controller
{
    public function __construct(
        protected RoundRobinService $roundRobin,
        protected BracketService $bracket,
        protected StandingsService $standings,
        protected MatchService $matches,
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

        $pools = $category->pools()->with('teams')->get();

        return Inertia::render('dashboard/events/basketball/matches/index', [
            'event' => $event,
            'category' => $category,
            'pools' => $pools,
            'teams' => $category->teams()->orderBy('name')->get(),
            'groupMatches' => $matches->where('round', 'group')->groupBy(fn ($m) => $m->pool_id ?? 'ungrouped'),
            'bracketMatches' => $matches->where('round', '!=', 'group')->groupBy('round'),
            'standings' => $pools->mapWithKeys(fn (Pool $pool) => [$pool->id => $this->standings->forPool($pool)]),
        ]);
    }

    /**
     * Generate round-robin matches for the entire category (round_robin format).
     */
    public function generate(Event $event, BasketballEventCategory $category)
    {
        $teams = $category->teams;

        if ($teams->count() < 2) {
            return back()->withErrors(['error' => 'Kategori ini memerlukan minimal 2 tim untuk membuat jadwal.']);
        }

        $this->roundRobin->generateForCategory($category, $teams);

        return back()->with('toast', [
            'title' => 'Sukses',
            'description' => 'Jadwal pertandingan round robin berhasil dibuat.',
        ]);
    }

    /**
     * Generate round-robin matches for a specific pool (pool_stage format).
     */
    public function generateForPool(Event $event, BasketballEventCategory $category, Pool $pool)
    {
        if ($pool->teams()->count() < 2) {
            return back()->withErrors(['error' => "Pool {$pool->name} memerlukan minimal 2 tim."]);
        }

        $this->roundRobin->generateForPool($pool);

        return back()->with('toast', [
            'title' => 'Sukses',
            'description' => "Jadwal pool {$pool->name} berhasil dibuat.",
        ]);
    }

    /**
     * Create a single match.
     */
    public function store(StoreMatchRequest $request, Event $event, BasketballEventCategory $category)
    {
        $this->matches->create($category, $request->validated());

        return back()->with('toast', [
            'title' => 'Sukses',
            'description' => 'Pertandingan berhasil dibuat.',
        ]);
    }

    /**
     * Update a match's fixture details (teams, pool, round, schedule).
     */
    public function update(StoreMatchRequest $request, Event $event, BasketballEventCategory $category, GameMatch $match)
    {
        $this->matches->update($match, $request->validated());

        return back()->with('toast', [
            'title' => 'Sukses',
            'description' => 'Pertandingan berhasil diperbarui.',
        ]);
    }

    /**
     * Update the score of a match and advance the bracket winner if applicable.
     */
    public function updateScore(UpdateMatchScoreRequest $request, Event $event, BasketballEventCategory $category, GameMatch $match)
    {
        $match->update($request->validated());

        if ($match->status === 'finished' && $match->round !== 'group') {
            $this->bracket->advanceWinner($match);
        }

        return back()->with('toast', [
            'title' => 'Sukses',
            'description' => 'Skor pertandingan berhasil diperbarui.',
        ]);
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

        return back()->with('toast', [
            'title' => 'Sukses',
            'description' => 'Pertandingan berhasil dihapus.',
        ]);
    }

    /**
     * Delete every match belonging to this category (all rounds/pools).
     */
    public function destroyAll(Event $event, BasketballEventCategory $category)
    {
        $category->matches()->delete();

        return back()->with('toast', [
            'title' => 'Sukses',
            'description' => 'Semua pertandingan berhasil dihapus.',
        ]);
    }
}
