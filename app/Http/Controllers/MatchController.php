<?php

namespace App\Http\Controllers;

use App\Models\BasketballEventCategory;
use App\Models\Event;
use App\Models\GameMatch;
use App\Services\Basketball\BracketService;
use Inertia\Inertia;

class MatchController extends Controller
{
    public function __construct(protected BracketService $bracket) {}

    /**
     * Show a single match detail page.
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
}
