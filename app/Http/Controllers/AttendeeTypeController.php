<?php

namespace App\Http\Controllers;

use App\Models\AttendeeType;
use App\Models\Event;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

class AttendeeTypeController extends Controller
{
    public function index(Event $event)
    {
        return Inertia::render('dashboard/events/attendee-types/index', [
            'event' => $event,
            'attendeeTypes' => $event->attendeeTypes()->withCount('attendees')->orderBy('label')->get(),
        ]);
    }

    public function store(Request $request, Event $event)
    {
        $validated = $this->validated($request, $event);

        $event->attendeeTypes()->create($validated);

        return redirect()->route('attendee-types.index', $event)->with(['toast' => [
            'title' => 'Success',
            'description' => 'Attendee type created successfully.',
        ]]);
    }

    public function update(Request $request, Event $event, AttendeeType $attendeeType)
    {
        abort_unless($attendeeType->event_id === $event->id, 404);

        $validated = $this->validated($request, $event, $attendeeType);

        $attendeeType->update($validated);

        return redirect()->route('attendee-types.index', $event)->with(['toast' => [
            'title' => 'Success',
            'description' => 'Attendee type updated successfully.',
        ]]);
    }

    public function destroy(Event $event, AttendeeType $attendeeType)
    {
        abort_unless($attendeeType->event_id === $event->id, 404);

        if ($attendeeType->attendees()->exists()) {
            return redirect()->route('attendee-types.index', $event)->with(['toast' => [
                'title' => 'Error',
                'description' => 'This type still has attendees assigned to it and cannot be deleted.',
            ]]);
        }

        $attendeeType->delete();

        return redirect()->route('attendee-types.index', $event)->with(['toast' => [
            'title' => 'Success',
            'description' => 'Attendee type deleted successfully.',
        ]]);
    }

    private function validated(Request $request, Event $event, ?AttendeeType $attendeeType = null): array
    {
        return $request->validate([
            'key' => [
                'required', 'string', 'max:100', 'regex:/^[a-z0-9_-]+$/',
                Rule::unique('attendee_types', 'key')->where('event_id', $event->id)->ignore($attendeeType?->id),
            ],
            'label' => ['required', 'string', 'max:255'],
            'icon' => ['nullable', 'string', 'max:100'],
            'color' => ['nullable', 'string', 'max:20'],
            'is_active' => ['nullable', 'boolean'],
        ], [
            'key.regex' => 'Key may only contain lowercase letters, numbers, dashes and underscores.',
        ]);
    }
}
