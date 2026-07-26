<?php

namespace App\Http\Controllers;

use App\Models\Attendee;
use App\Models\AttendeeType;
use App\Models\Event;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

class AttendeeController extends Controller
{
    public function index(Request $request, Event $event)
    {
        $filters = $request->only(['search', 'type', 'status']);

        $attendees = $event->attendees()
            ->with('attendeeType')
            ->when($filters['search'] ?? null, fn ($q, $search) => $q->where('name', 'like', "%{$search}%"))
            ->when($filters['type'] ?? null, fn ($q, $typeId) => $q->where('attendee_type_id', $typeId))
            ->when($filters['status'] ?? null, fn ($q, $status) => $q->where('status', $status))
            ->latest()
            ->paginate(10)
            ->withQueryString();

        return Inertia::render('dashboard/events/attendees/index', [
            'event' => $event,
            'attendees' => $attendees,
            'filters' => $filters,
            'attendeeTypes' => AttendeeType::where('is_active', true)->orderBy('label')->get(),
        ]);
    }

    public function store(Request $request, Event $event)
    {
        $validated = $this->validated($request);

        $event->attendees()->create($validated);

        return redirect()->route('attendees.index', $event)->with(['toast' => [
            'title' => 'Success',
            'description' => 'Attendee added successfully.',
        ]]);
    }

    public function update(Request $request, Event $event, Attendee $attendee)
    {
        abort_unless($attendee->event_id === $event->id, 404);

        $validated = $this->validated($request);

        $attendee->update($validated);

        return redirect()->route('attendees.index', $event)->with(['toast' => [
            'title' => 'Success',
            'description' => 'Attendee updated successfully.',
        ]]);
    }

    public function destroy(Event $event, Attendee $attendee)
    {
        abort_unless($attendee->event_id === $event->id, 404);

        $attendee->delete();

        return redirect()->route('attendees.index', $event)->with(['toast' => [
            'title' => 'Success',
            'description' => 'Attendee removed successfully.',
        ]]);
    }

    private function validated(Request $request): array
    {
        return $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'attendee_type_id' => ['required', Rule::exists('attendee_types', 'id')],
            'photo' => ['nullable', 'url', 'max:255'],
            'organization' => ['nullable', 'string', 'max:255'],
            'title' => ['nullable', 'string', 'max:255'],
            'email' => ['nullable', 'email', 'max:255'],
            'phone' => ['nullable', 'string', 'max:50'],
            'status' => ['nullable', Rule::in(Attendee::STATUSES)],
            'notes' => ['nullable', 'string', 'max:2000'],
        ]);
    }
}
