<?php

namespace App\Http\Controllers;

use App\Models\Event;
use App\Models\Meeting;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

class MeetingController extends Controller
{
    /**
     * JSON search used by the QR scanner's meeting combobox — the scanner isn't
     * scoped to a single event, so this searches across all events by title.
     */
    public function search(Request $request)
    {
        $query = $request->query('q', '');

        $organizationId = $request->user()->current_organization_id;

        $meetings = Meeting::with('event')
            ->whereRelation('event', 'organization_id', $organizationId)
            ->when($query, fn ($q) => $q->where('title', 'like', "%{$query}%"))
            ->orderByDesc('scheduled_at')
            ->limit(20)
            ->get(['id', 'event_id', 'title', 'scheduled_at']);

        return response()->json($meetings);
    }

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
