<?php

namespace App\Http\Controllers;

use App\Models\Event;
use App\Models\Speaker;
use Illuminate\Http\Request;
use Inertia\Inertia;

class SpeakerController extends Controller
{
    public function index(Event $event)
    {
        return Inertia::render('dashboard/events/speakers/index', [
            'event' => $event,
            'speakers' => $event->speakers()->withCount('meetings')->orderBy('name')->get(),
        ]);
    }

    public function store(Request $request, Event $event)
    {
        $validated = $this->validated($request);

        $event->speakers()->create($validated);

        return redirect()->route('speakers.index', $event)->with(['toast' => [
            'title' => 'Success',
            'description' => 'Speaker added successfully.',
        ]]);
    }

    public function update(Request $request, Event $event, Speaker $speaker)
    {
        abort_unless($speaker->event_id === $event->id, 404);

        $validated = $this->validated($request);

        $speaker->update($validated);

        return redirect()->route('speakers.index', $event)->with(['toast' => [
            'title' => 'Success',
            'description' => 'Speaker updated successfully.',
        ]]);
    }

    public function destroy(Event $event, Speaker $speaker)
    {
        abort_unless($speaker->event_id === $event->id, 404);

        if ($speaker->meetings()->exists()) {
            return redirect()->route('speakers.index', $event)->with(['toast' => [
                'title' => 'Error',
                'description' => 'This speaker still has meetings assigned to them and cannot be deleted.',
            ]]);
        }

        $speaker->delete();

        return redirect()->route('speakers.index', $event)->with(['toast' => [
            'title' => 'Success',
            'description' => 'Speaker removed successfully.',
        ]]);
    }

    private function validated(Request $request): array
    {
        return $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'photo' => ['nullable', 'url', 'max:255'],
            'title' => ['nullable', 'string', 'max:255'],
            'bio' => ['nullable', 'string', 'max:2000'],
        ]);
    }
}
