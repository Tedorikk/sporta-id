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

        $basketballEvent = BasketballEvent::create();

        $event->specific()->associate($basketballEvent);
        $event->save();

        return redirect()->back()->with(['toast' => [
            'title' => 'Success',
            'description' => 'Turnamen Basket berhasil dibuat.',
        ]]);
    }

    public function update(Request $request, Event $event)
    {
        abort_unless($event->specific instanceof BasketballEvent, 404);

        $validated = $request->validate([
            'registration_open' => ['required', 'boolean'],
        ]);

        $event->specific->update($validated);

        return redirect()->back()->with(['toast' => [
            'title' => 'Success',
            'description' => $validated['registration_open']
                ? 'Registration is now open to players.'
                : 'Registration is now closed.',
        ]]);
    }
}
