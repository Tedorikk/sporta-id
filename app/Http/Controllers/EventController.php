<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Event;
use Inertia\Inertia;

class EventController extends Controller
{
    public function index()
    {
        $events = Event::all();
        return Inertia::render('dashboard/events/index', ['events' => $events]);
    }

    public function show(Event $event)
    {
        return Inertia::render('dashboard/events/show', [
            'event' => $event,
        ]);
    }

    public function create()
    {
        return Inertia::render('dashboard/events/create');
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'min:5', 'max:255'],
            'description' => ['nullable', 'string'],
            'contact_person' => ['required', 'string', 'regex:/^\+[1-9]\d{1,14}$/'],
            'category' => ['required', 'string'],
            'is_published' => ['required', 'boolean'],
            'start_date' => ['required', 'date'],
            'end_date' => ['required', 'date', 'after_or_equal:start_date'],
            'banner' => ['nullable', 'url'],
        ], [
            'contact_person.regex' => 'Invalid E.164 format',
            'end_date.after_or_equal' => 'End date must be on or after the start date',
        ]);

        $event = Event::create($validated);

        return redirect()
            ->route('events.index')
            ->with([
                'toast' => [
                    'title' => 'Success',
                    'description' => 'Event created successfully.',
                ],
            ]);
    }

    public function edit(Event $event)
    {
        return Inertia::render('dashboard/events/edit', [
            'event' => $event,
        ]);
    }

    public function update(Request $request, Event $event)
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'min:5', 'max:255'],
            'description' => ['nullable', 'string'],
            'contact_person' => ['required', 'string', 'regex:/^\+[1-9]\d{1,14}$/'],
            'category' => ['required', 'string'],
            'is_published' => ['required', 'boolean'],
            'start_date' => ['required', 'date'],
            'end_date' => ['required', 'date', 'after_or_equal:start_date'],
            'banner' => ['nullable', 'url'],
        ], [
            'contact_person.regex' => 'Invalid E.164 format',
            'end_date.after_or_equal' => 'End date must be on or after the start date',
        ]);

        $event->update($validated);

        return redirect()
            ->route('events.show', $event)
            ->with([
                'toast' => [
                    'title' => 'Success',
                    'description' => 'Event updated successfully.',
                ],
            ]);
    }

    public function destroy(Event $event)
    {
        $event->delete();

        return redirect()
            ->route('events.index')
            ->with([
                'toast' => [
                    'title' => 'Success',
                    'description' => 'Event deleted successfully.',
                ],
            ]);
    }
}
