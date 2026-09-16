<?php

namespace App\Http\Controllers;

use App\Models\BasketballEvent;
use App\Models\BasketballEventCategory;
use App\Models\Event;
use App\Models\Pool;
use App\Models\RegistrationCategory;
use App\Models\RunningEvent;
use App\Models\RunningEventCategory;
use App\Services\Basketball\StandingsService;
use App\Services\Running\RaceRankingService;
use Illuminate\Http\Request;
use Inertia\Inertia;

class PublicEventController extends Controller
{
    public function __construct(
        protected StandingsService $standings,
        protected RaceRankingService $rankings,
    ) {}

    public function index(Request $request)
    {
        $filters = $request->only(['search', 'category']);

        $events = Event::query()
            ->lifecycle('published')
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

    /**
     * Where /events/{event}/register goes now that the basketball-only form
     * behind it is gone: straight into the form when exactly one category is
     * open, otherwise the event page, which lists them all with prices and
     * availability.
     */
    public function register(Event $event)
    {
        $available = $event->registrationCategories()
            ->get()
            ->filter(fn (RegistrationCategory $category) => $category->isOpen() && $category->hasAvailableQuota());

        if ($available->count() === 1) {
            return redirect()->route('registrations.create', [$event, $available->first()]);
        }

        return redirect()->route('events.public.show', $event);
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
                ->get(['id', 'basketball_event_id', 'registration_category_id', 'name', 'format'])
                ->map(function (BasketballEventCategory $category) {
                    return [
                        ...$category->toArray(),
                        'standings' => $category->pools->isNotEmpty()
                            ? $category->pools->mapWithKeys(fn (Pool $pool) => ['pool_'.$pool->id => $this->standings->forPool($pool)])
                            : ['overall' => $this->standings->forCategory($category)],
                    ];
                });
        }

        // Results are a published thing, not a live one: a leaderboard only
        // exists on this page once the organizer says the times are final.
        $raceResults = null;

        if ($event->specific instanceof RunningEvent && $event->specific->results_published) {
            $raceResults = $event->specific->categories()
                ->orderBy('distance_meters')
                ->get()
                ->map(fn (RunningEventCategory $category) => [
                    'id' => $category->id,
                    'name' => $category->name,
                    'distance_meters' => $category->distance_meters,
                    'rankings' => $this->rankings->forCategory($category),
                    'unranked' => $this->rankings->unrankedFor($category)
                        ->map(fn ($participant) => $participant->only(['id', 'bib_number', 'name', 'status'])),
                ])
                ->values();
        }

        $meetings = $event->meetings()->with('speaker')->orderBy('scheduled_at')->get();

        // Every category is listed with its price, including ones that are
        // closed or full — a price list that hides its own items reads as an
        // empty catalogue to a first-time visitor. `is_available` carries the
        // same isOpen()/hasAvailableQuota() verdict the register page enforces,
        // so an unavailable row renders as a disabled card instead of a link.
        $registrationCategories = $event->registrationCategories()
            ->with('runningCategory.runningEvent')
            ->orderBy('name')
            ->get()
            ->map(fn (RegistrationCategory $category) => $category->toPublicArray())
            ->values();

        return Inertia::render('events/show', [
            'event' => $event,
            'categories' => $categories,
            'raceResults' => $raceResults,
            'meetings' => $meetings,
            'registrationCategories' => $registrationCategories,
        ]);
    }
}
