<?php

namespace App\Http\Controllers;

use App\Models\Event;
use App\Models\Pool;
use App\Models\Team;
use Illuminate\Http\Request;
use Inertia\Inertia;

class PoolController extends Controller
{
    public function index(Event $event)
    {
        // Load pools with their assigned teams
        $pools = $event->pools()->with('teams')->get();
        
        // Load all teams registered to this event
        $teams = $event->teams()->get();

        return Inertia::render('dashboard/events/pools/index', [
            'event' => $event,
            'pools' => $pools,
            'teams' => $teams,
        ]);
    }

    public function store(Request $request, Event $event)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:50',
        ]);

        $event->pools()->create($validated);

        return back()->with('success', "Pool {$validated['name']} created successfully.");
    }

    public function destroy(Event $event, Pool $pool)
    {
        $pool->delete();
        return back()->with('success', 'Pool deleted successfully.');
    }

    public function assignTeam(Request $request, Event $event, Pool $pool)
    {
        $validated = $request->validate([
            'team_id' => 'required|exists:teams,id',
        ]);

        // Prevent duplicate assignments in the same pool
        if (!$pool->teams()->where('team_id', $validated['team_id'])->exists()) {
            $pool->teams()->attach($validated['team_id']);
        }

        return back()->with('success', 'Team assigned to pool.');
    }

    public function removeTeam(Request $request, Event $event, Pool $pool, Team $team)
    {
        $pool->teams()->detach($team->id);
        return back()->with('success', 'Team removed from pool.');
    }

    public function autoAssign(Request $request, Event $event)
    {
        $validated = $request->validate([
            'prefix' => 'required|string|max:20', // e.g., "Group"
            'number_of_pools' => 'required|integer|min:1|max:10',
            'teams_per_pool' => 'required|integer|min:1',
            'numbering_style' => 'required|in:numeric,alpha,roman',
        ]);

        // Get all available teams not yet in a pool
        $availableTeams = $event->teams()
            ->whereDoesntHave('pools')
            ->get();

        $createdPools = 0;

        for ($i = 1; $i <= $validated['number_of_pools']; $i++) {
            $label = $this->numberingLabel($validated['numbering_style'], $i);

            // Create the pool
            $pool = $event->pools()->create([
                'name' => "{$validated['prefix']} {$label}"
            ]);

            // Pop the required number of teams from the collection
            $teamsToAssign = $availableTeams->splice(0, $validated['teams_per_pool']);

            if ($teamsToAssign->isNotEmpty()) {
                $pool->teams()->attach($teamsToAssign->pluck('id'));
                $createdPools++;
            }
        }

        return back()->with('toast', [
            'title' => 'Success',
            'description' => "Created {$createdPools} pools automatically."
        ]);
    }

    private function numberingLabel(string $style, int $n): string
    {
        return match ($style) {
            'alpha' => $this->toAlpha($n),
            'roman' => $this->toRoman($n),
            default => (string) $n,
        };
    }

    private function toAlpha(int $n): string
    {
        $label = '';

        while ($n > 0) {
            $remainder = ($n - 1) % 26;
            $label = chr(65 + $remainder).$label;
            $n = intdiv($n - 1, 26);
        }

        return $label;
    }

    private function toRoman(int $n): string
    {
        $map = [
            1000 => 'M', 900 => 'CM', 500 => 'D', 400 => 'CD',
            100 => 'C', 90 => 'XC', 50 => 'L', 40 => 'XL',
            10 => 'X', 9 => 'IX', 5 => 'V', 4 => 'IV', 1 => 'I',
        ];

        $result = '';

        foreach ($map as $value => $symbol) {
            while ($n >= $value) {
                $result .= $symbol;
                $n -= $value;
            }
        }

        return $result;
    }

    public function destroyAll(Event $event)
    {
        $event->pools()->get()->each(function (Pool $pool) {
            $pool->teams()->detach();
            $pool->delete();
        });

        return back()->with('success', 'All pools removed.');
    }
}