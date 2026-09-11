<?php

namespace App\Http\Controllers;

use App\Models\Event;
use App\Models\RunningEvent;
use Illuminate\Http\Request;

class RunningEventController extends Controller
{
    public function store(Request $request, Event $event)
    {
        // Prevent multiple creations
        if ($event->eventable_type === RunningEvent::class) {
            return redirect()->back()->with(['toast' => [
                'title' => 'Error',
                'description' => 'This event is already set up as a race.',
                'variant' => 'destructive',
            ]]);
        }

        $runningEvent = RunningEvent::create();

        $event->specific()->associate($runningEvent);
        $event->save();

        return redirect()->back()->with(['toast' => [
            'title' => 'Success',
            'description' => 'Race set up successfully.',
        ]]);
    }

    public function update(Request $request, Event $event)
    {
        abort_unless($event->specific instanceof RunningEvent, 404);

        $validated = $request->validate([
            'registration_open' => ['sometimes', 'boolean'],
            'results_published' => ['sometimes', 'boolean'],
        ]);

        abort_if($validated === [], 422);

        $event->specific->update($validated);

        return redirect()->back()->with(['toast' => [
            'title' => 'Success',
            'description' => $this->confirmationFor($validated),
        ]]);
    }

    /**
     * @param  array{registration_open?: bool, results_published?: bool}  $validated
     */
    private function confirmationFor(array $validated): string
    {
        if (array_key_exists('results_published', $validated)) {
            return $validated['results_published']
                ? 'Results are now public.'
                : 'Results are hidden from the public page.';
        }

        return $validated['registration_open']
            ? 'Registration is now open to runners.'
            : 'Registration is now closed.';
    }
}
