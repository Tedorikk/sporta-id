<?php

namespace App\Http\Controllers;

use App\Models\BasketballEventCategory;
use App\Models\Event;
use App\Models\Pool;
use App\Models\Team;
use App\Services\Basketball\PoolService;
use Illuminate\Http\Request;
use Inertia\Inertia;

class PoolController extends Controller
{
    public function __construct(protected PoolService $poolService) {}

    public function index(Event $event, BasketballEventCategory $category)
    {
        $pools = $category->pools()->with('teams')->get();
        $teams = $category->teams()->get();

        return Inertia::render('dashboard/events/basketball/pools/index', [
            'event' => $event,
            'category' => $category,
            'pools' => $pools,
            'teams' => $teams,
        ]);
    }

    public function store(Request $request, Event $event, BasketballEventCategory $category)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:50',
        ]);

        $this->poolService->createPool($category, $validated['name']);

        return back()->with(['toast' => [
            'title' => 'Sukses',
            'description' => "Pool {$validated['name']} berhasil dibuat.",
        ]]);
    }

    public function destroy(Event $event, BasketballEventCategory $category, Pool $pool)
    {
        $pool->teams()->detach();
        $pool->delete();

        return back()->with(['toast' => [
            'title' => 'Sukses',
            'description' => 'Pool berhasil dihapus.',
        ]]);
    }

    public function destroyAll(Event $event, BasketballEventCategory $category)
    {
        $category->pools()->get()->each(function (Pool $pool) {
            $pool->teams()->detach();
            $pool->delete();
        });

        return back()->with(['toast' => [
            'title' => 'Sukses',
            'description' => 'Semua pool berhasil dihapus.',
        ]]);
    }

    public function assignTeam(Request $request, Event $event, BasketballEventCategory $category, Pool $pool)
    {
        $validated = $request->validate([
            'team_id' => 'required|exists:teams,id',
        ]);

        $team = Team::findOrFail($validated['team_id']);

        try {
            $this->poolService->assignTeamToPool($team, $pool);

            return back()->with(['toast' => [
                'title' => 'Sukses',
                'description' => "Tim {$team->name} berhasil ditambahkan ke {$pool->name}.",
            ]]);
        } catch (\Exception $e) {
            return back()->withErrors(['error' => $e->getMessage()]);
        }
    }

    public function removeTeam(Event $event, BasketballEventCategory $category, Pool $pool, Team $team)
    {
        $this->poolService->removeTeamFromPool($team, $pool);

        return back()->with(['toast' => [
            'title' => 'Sukses',
            'description' => 'Tim berhasil dikeluarkan dari pool.',
        ]]);
    }

    public function autoAssign(Request $request, Event $event, BasketballEventCategory $category)
    {
        $validated = $request->validate([
            'prefix' => 'required|string|max:20',
            'number_of_pools' => 'required|integer|min:1|max:10',
            'teams_per_pool' => 'required|integer|min:1',
            'numbering_style' => 'required|in:numeric,alpha,roman',
        ]);

        $created = $this->poolService->autoAssign(
            $category,
            $validated['prefix'],
            $validated['number_of_pools'],
            $validated['teams_per_pool'],
            $validated['numbering_style'],
        );

        return back()->with(['toast' => [
            'title' => 'Sukses',
            'description' => "Berhasil membuat {$created} pool secara otomatis.",
        ]]);
    }
}
