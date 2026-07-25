<?php

namespace App\Http\Controllers;

use App\Models\BasketballEvent;
use App\Models\Event;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Inertia\Inertia;

class EventController extends Controller
{
    public function index(Request $request)
    {
        $view = $request->input('view', 'grid');

        $filters = $request->only(['search', 'category', 'status']);

        $base = Event::query()
            ->search($filters['search'] ?? null)
            ->category($filters['category'] ?? null)
            ->status($filters['status'] ?? null);

        $categories = Event::query()
            ->whereNotNull('category')
            ->distinct()
            ->orderBy('category')
            ->pluck('category');

        $stats = $this->computeStats(clone $base);

        if ($view === 'calendar') {
            $month = $request->input('month', now()->format('Y-m'));
            $start = Carbon::parse($month.'-01')->startOfMonth();
            $end = $start->copy()->endOfMonth();

            $events = (clone $base)
                ->where(function ($q) use ($start, $end) {
                    $q->whereBetween('start_date', [$start, $end])
                        ->orWhereBetween('end_date', [$start, $end])
                        ->orWhere(function ($q2) use ($start, $end) {
                            $q2->where('start_date', '<=', $start)
                                ->where('end_date', '>=', $end);
                        });
                })
                ->orderBy('start_date')
                ->get();

            return Inertia::render('dashboard/events/index', [
                'view' => 'calendar',
                'month' => $start->format('Y-m'),
                'events' => $events,
                'filters' => $filters,
                'categories' => $categories,
                'stats' => $stats,
            ]);
        }

        $events = (clone $base)
            ->orderBy('start_date', 'desc')
            ->paginate(9)
            ->withQueryString();

        return Inertia::render('dashboard/events/index', [
            'view' => 'grid',
            'events' => $events,
            'filters' => $filters,
            'categories' => $categories,
            'stats' => $stats,
        ]);
    }

    private function computeStats($query): array
    {
        $today = now()->startOfDay();

        // clone once per branch so each count query doesn't leak into the next
        $total = (clone $query)->count();
        $published = (clone $query)->where('is_published', true)->count();
        $upcoming = (clone $query)->where('start_date', '>', $today)->count();
        $ongoing = (clone $query)
            ->where('start_date', '<=', $today)
            ->where('end_date', '>=', $today)
            ->count();
        $past = (clone $query)->where('end_date', '<', $today)->count();

        return [
            'total' => $total,
            'published' => $published,
            'upcoming' => $upcoming,
            'ongoing' => $ongoing,
            'past' => $past,
        ];
    }

    public function show(Event $event)
    {
        $event->load('specific');

        $extra = [];

        if ($event->specific instanceof BasketballEvent) {
            $event->specific->load('categories');

            $extra = [
                'teams_count' => $event->teams()->count(),
                'pools_count' => $event->pools()->count(),
                'matches_count' => $event->matches()->count(),
                'basketball_categories' => $event->specific->categories,
                'pools' => $event->pools()->with('teams')->get(),
                'teams' => $event->teams()->get(),
            ];
        }

        return Inertia::render('dashboard/events/show', [
            'event' => [
                ...$event->toArray(),
                'specific_type' => $event->eventable_type
                    ? class_basename($event->eventable_type)
                    : null,
            ] + $extra,
        ]);
    }

    public function create()
    {
        return Inertia::render('dashboard/events/create');
    }

    public function store(Request $request)
    {
        $validated = $this->validated($request);

        Event::create($validated);

        return redirect()
            ->route('events.index')
            ->with(['toast' => [
                'title' => 'Success',
                'description' => 'Event created successfully.',
            ]]);
    }

    public function edit(Event $event)
    {
        return Inertia::render('dashboard/events/edit', [
            'event' => $event,
        ]);
    }

    public function update(Request $request, Event $event)
    {
        $validated = $this->validated($request);

        $event->update($validated);

        return redirect()
            ->route('events.show', $event)
            ->with(['toast' => [
                'title' => 'Success',
                'description' => 'Event updated successfully.',
            ]]);
    }

    public function destroy(Event $event)
    {
        $event->delete();

        return redirect()
            ->route('events.index')
            ->with(['toast' => [
                'title' => 'Success',
                'description' => 'Event deleted successfully.',
            ]]);
    }

    private function validated(Request $request): array
    {
        return $request->validate([
            'name' => ['required', 'string', 'min:5', 'max:255'],
            'description' => ['nullable', 'string'],
            'contact_person' => ['required', 'string', 'regex:/^\+[1-9]\d{1,14}$/'],
            'category' => ['required', 'string'],
            'is_published' => ['required', 'boolean'],
            'start_date' => ['required', 'date'],
            'end_date' => ['required', 'date', 'after_or_equal:start_date'],
            'banner' => ['nullable', 'url'],
            'instagram_url' => ['nullable', 'url'],
            'facebook_url' => ['nullable', 'url'],
            'youtube_url' => ['nullable', 'url'],
            'whatsapp_url' => ['nullable', 'url'],
        ], [
            'contact_person.regex' => 'Invalid E.164 format',
            'end_date.after_or_equal' => 'End date must be on or after the start date',
        ]);
    }
}
