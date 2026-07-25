<?php

namespace App\Http\Controllers;

use App\Models\BasketballEvent;
use App\Models\Event;
use Inertia\Inertia;

class EventMatchController extends Controller
{
    /**
     * List every match across all categories/pools for this event, unscoped —
     * grouping (by day, category, etc.) happens client-side.
     */
    public function index(Event $event)
    {
        $matches = $event->matches()
            ->with(['homeTeam', 'awayTeam', 'pool', 'category'])
            ->orderBy('scheduled_at')
            ->orderBy('match_number')
            ->get();

        $event->loadMissing('specific');

        // Pools/teams per category so the edit dialog can offer the right
        // fixture options no matter which category a match belongs to.
        $categories = $event->specific instanceof BasketballEvent
            ? $event->specific->categories()->with(['pools.teams', 'teams'])->get()
            : collect();

        return Inertia::render('dashboard/events/matches/index', [
            'event' => $event,
            'matches' => $matches,
            'categories' => $categories,
        ]);
    }
}
