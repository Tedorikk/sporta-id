<?php

namespace App\Http\Controllers;

use App\Models\BasketballEvent;
use App\Models\Event;
use App\Models\Team;
use Inertia\Inertia;

class PlayerLookupController extends Controller
{
    /**
     * Public "find my ID card" page: event -> category -> team -> player.
     */
    public function index()
    {
        $events = Event::query()
            ->where('is_published', true)
            ->orderBy('start_date')
            ->get(['id', 'name'])
            ->map(fn (Event $event) => ['id' => $event->id, 'name' => $event->name]);

        return Inertia::render('find-id', [
            'events' => $events,
        ]);
    }

    /**
     * JSON: categories (with their teams) for the given event.
     * Only id/name for teams — no roster or contact data.
     */
    public function categories(Event $event)
    {
        $event->loadMissing('specific');

        abort_unless($event->specific instanceof BasketballEvent, 404);

        $categories = $event->specific->categories()
            ->with(['teams' => function ($query) {
                $query->where('status', '!=', 'rejected')
                    ->select('id', 'name', 'basketball_event_category_id');
            }])
            ->get(['id', 'name', 'basketball_event_id']);

        return response()->json($categories);
    }

    /**
     * JSON: players on the given team, name + jersey number only.
     * Never expose photo/phone/email/dob here — this list is public
     * and used only to let a player identify themselves before the
     * single-player id-card reveal.
     */
    public function players(Team $team)
    {
        $players = $team->players()->get(['players.id', 'players.name', 'players.jersey_number']);

        return response()->json($players);
    }
}
