<?php

namespace App\Http\Controllers;

use App\Models\BasketballEvent;
use App\Models\BasketballEventCategory;
use App\Models\Event;
use App\Models\Pool;
use App\Services\Basketball\StandingsService;
use Illuminate\Http\Request;
use Inertia\Inertia;

class PublicEventController extends Controller
{
    public function __construct(protected StandingsService $standings) {}

    public function index(Request $request)
    {
        $filters = $request->only(['search', 'category']);

        $events = Event::query()
            ->status('published')
            ->search($filters['search'] ?? null)
            ->category($filters['category'] ?? null)
            ->orderBy('start_date')
            ->paginate(9)
            ->withQueryString();

        $categories = Event::query()
            ->where('is_published', true)
            ->whereNotNull('category')
            ->distinct()
            ->orderBy('category')
            ->pluck('category');

        $calendarEvents = Event::query()
            ->where('is_published', true)
            ->orderBy('start_date')
            ->get(['id', 'name', 'start_date', 'end_date']);

        return Inertia::render('events/index', [
            'events' => $events,
            'filters' => $filters,
            'categories' => $categories,
            'calendarEvents' => $calendarEvents,
        ]);
    }

    public function show(Event $event)
    {
        abort_unless($event->is_published, 404);

        $event->loadMissing('specific');

        $categories = null;

        if ($event->specific instanceof BasketballEvent) {
            $categories = $event->specific->categories()
                ->with([
                    'pools.teams' => fn ($query) => $query->where('status', 'verified'),
                    'teams' => fn ($query) => $query->where('status', 'verified'),
                    'matches' => fn ($query) => $query
                        ->with(['homeTeam', 'awayTeam'])
                        ->orderBy('round')
                        ->orderBy('match_number')
                        ->orderBy('scheduled_at'),
                ])
                ->get(['id', 'basketball_event_id', 'name', 'format', 'price', 'quota'])
                ->map(function (BasketballEventCategory $category) {
                    return [
                        ...$category->toArray(),
                        'standings' => $category->pools->isNotEmpty()
                            ? $category->pools->mapWithKeys(fn (Pool $pool) => ['pool_'.$pool->id => $this->standings->forPool($pool)])
                            : ['overall' => $this->standings->forCategory($category)],
                    ];
                });
        }

        return Inertia::render('events/show', [
            'event' => $event,
            'categories' => $categories,
        ]);
    }
}
