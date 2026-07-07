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
            'status' => 'required|in:scheduled,ongoing,completed',
        ]);

        $match->update($validated);

        // Advance winner in knockout bracket
        if ($validated['status'] === 'completed' && $match->round !== 'group') {
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
}
