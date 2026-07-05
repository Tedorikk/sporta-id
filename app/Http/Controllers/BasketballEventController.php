<?php

namespace App\Http\Controllers;

use App\Models\BasketballEvent;
use App\Models\Event;
use Illuminate\Http\Request;

class BasketballEventController extends Controller
{
    public function store(Request $request, Event $event)
    {
        // Prevent multiple creations
        if ($event->eventable_type === BasketballEvent::class) {
            return redirect()->back()->with(['toast' => [
                'title' => 'Error',
                'description' => 'Event ini sudah menjadi Turnamen Basket.',
                'variant' => 'destructive',
            ]]);
        }

        $basketballEvent = BasketballEvent::create([
            // default values for max_players_per_team if needed
            'max_players_per_team' => 12, // example default
        ]);

        $event->specific()->associate($basketballEvent);
        $event->save();

        return redirect()->back()->with(['toast' => [
            'title' => 'Success',
            'description' => 'Turnamen Basket berhasil dibuat.',
        ]]);
    }
}
