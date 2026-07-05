<?php

namespace App\Http\Controllers\Admin\Basketball;

use App\Http\Controllers\Controller;
use App\Models\Event;
use App\Models\Pool;
use App\Models\Team;
use App\Services\Basketball\PoolService;
use Illuminate\Http\Request;

class PoolController extends Controller
{
    public function __construct(
        protected PoolService $poolService
    ) {}

    // Buat Pool Baru (misal: "Grup A")
    public function store(Request $request, Event $event)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:50'
        ]);

        $this->poolService->createPool($event, $validated['name']);

        return back()->with(['toast' => [
            'title' => 'Sukses',
            'description' => "Pool {$validated['name']} berhasil dibuat."
        ]]);
    }

    // Assign tim ke dalam pool (via Drag and Drop di UI)
    public function assignTeam(Request $request, Event $event, Pool $pool)
    {
        $validated = $request->validate([
            'team_id' => 'required|exists:teams,id'
        ]);

        $team = Team::findOrFail($validated['team_id']);

        try {
            $this->poolService->assignTeamToPool($team, $pool);

            return back()->with(['toast' => [
                'title' => 'Sukses',
                'description' => "Tim {$team->name} berhasil ditambahkan ke {$pool->name}."
            ]]);
        } catch (\Exception $e) {
            // Error exception dari service (misal: tim sudah di pool lain) akan ditangkap di sini
            return back()->withErrors(['error' => $e->getMessage()]);
        }
    }

    // Hapus tim dari pool
    public function removeTeam(Request $request, Event $event, Pool $pool, Team $team)
    {
        $this->poolService->removeTeamFromPool($team, $pool);
        return back();
    }
}
