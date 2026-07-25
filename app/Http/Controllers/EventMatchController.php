<?php

namespace App\Http\Controllers;

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

        return Inertia::render('dashboard/events/matches/index', [
            'event' => $event,
            'matches' => $matches,
        ]);
    }
}
