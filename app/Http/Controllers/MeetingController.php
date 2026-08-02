<?php

namespace App\Http\Controllers;

use App\Models\Event;
use App\Models\Meeting;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

class MeetingController extends Controller
{
    public function index(Event $event)
    {
        return Inertia::render('dashboard/events/meetings/index', [
            'event' => $event,
            'meetings' => $event->meetings()->with('speaker')->withCount('checkIns')->orderBy('scheduled_at')->get(),
            'speakers' => $event->speakers()->orderBy('name')->get(),
        ]);
    }

    public function store(Request $request, Event $event)
    {
        $validated = $this->validated($request, $event);

        $event->meetings()->create($validated);

        return redirect()->route('meetings.index', $event)->with(['toast' => [
            'title' => 'Success',
            'description' => 'Meeting created successfully.',
        ]]);
    }

    public function update(Request $request, Event $event, Meeting $meeting)
    {
        abort_unless($meeting->event_id === $event->id, 404);

        $validated = $this->validated($request, $event);

        $meeting->update($validated);

        return redirect()->route('meetings.index', $event)->with(['toast' => [
            'title' => 'Success',
            'description' => 'Meeting updated successfully.',
        ]]);
    }

    public function destroy(Event $event, Meeting $meeting)
    {
        abort_unless($meeting->event_id === $event->id, 404);

        $meeting->delete();

        return redirect()->route('meetings.index', $event)->with(['toast' => [
            'title' => 'Success',
            'description' => 'Meeting deleted successfully.',
        ]]);
    }

    private function validated(Request $request, Event $event): array
    {
        return $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'speaker_id' => ['nullable', Rule::exists('speakers', 'id')->where('event_id', $event->id)],
            'description' => ['nullable', 'string', 'max:2000'],
            'location' => ['nullable', 'string', 'max:255'],
            'scheduled_at' => ['required', 'date'],
            'ends_at' => ['nullable', 'date', 'after:scheduled_at'],
        ]);
    }
}
