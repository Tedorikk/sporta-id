<?php

namespace App\Http\Controllers;

use App\Models\BasketballEvent;
use App\Models\Event;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

class EventController extends Controller
{
    /** Columns the list may be ordered by. Anything else falls back to the default. */
    private const SORTABLE = ['name', 'start_date', 'end_date'];

    private const PER_PAGE = ['table' => 25, 'grid' => 9];

    public function index(Request $request)
    {
        Gate::authorize('viewAny', Event::class);

        $view = in_array($request->input('view'), ['table', 'grid', 'calendar'], true)
            ? $request->input('view')
            : 'table';

        $filters = [
            'search' => $request->input('search') ?: null,
            'category' => $request->input('category') ?: null,
            'lifecycle' => in_array($request->input('lifecycle'), ['published', 'draft'], true)
                ? $request->input('lifecycle')
                : null,
            'timing' => in_array($request->input('timing'), ['upcoming', 'ongoing', 'past'], true)
                ? $request->input('timing')
                : null,
        ];

        $sort = in_array($request->input('sort'), self::SORTABLE, true)
            ? $request->input('sort')
            : 'start_date';
        $direction = $request->input('direction') === 'asc' ? 'asc' : 'desc';

        $organizationId = $request->user()->current_organization_id;

        // Rebuilt per use: Eloquent builders are stateful, so sharing one between the
        // list query and the six facet counts would leak constraints between them.
        $scoped = fn () => Event::query()
            ->forOrganization($organizationId)
            ->search($filters['search'])
            ->category($filters['category']);

        $categories = Event::query()
            ->forOrganization($organizationId)
            ->whereNotNull('category')
            ->distinct()
            ->orderBy('category')
            ->pluck('category');

        $stats = $this->computeStats($scoped, $filters);

        // Distinguishes "this organization has no events yet" (show onboarding) from
        // "these filters matched nothing" (show a way back). Both render as empty.
        $hasAnyEvents = Event::query()->forOrganization($organizationId)->exists();

        if ($view === 'calendar') {
            $month = $request->input('month', now()->format('Y-m'));
            $start = Carbon::parse($month.'-01')->startOfMonth();
            $end = $start->copy()->endOfMonth();

            $events = $scoped()
                ->lifecycle($filters['lifecycle'])
                ->timing($filters['timing'])
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
                'sort' => ['column' => $sort, 'direction' => $direction],
                'categories' => $categories,
                'stats' => $stats,
                'has_any_events' => $hasAnyEvents,
            ]);
        }

        $events = $scoped()
            ->lifecycle($filters['lifecycle'])
            ->timing($filters['timing'])
            ->withCount(['attendees', 'registrationCategories'])
            // Feeds the quick-view panel's price line without a second request.
            ->withMin('registrationCategories as price_from', 'price')
            ->withMax('registrationCategories as price_to', 'price')
            ->orderBy($sort, $direction)
            ->paginate(self::PER_PAGE[$view])
            ->withQueryString();

        return Inertia::render('dashboard/events/index', [
            'view' => $view,
            'events' => $events,
            'filters' => $filters,
            'sort' => ['column' => $sort, 'direction' => $direction],
            'categories' => $categories,
            'stats' => $stats,
            'has_any_events' => $hasAnyEvents,
        ]);
    }

    /**
     * Facet counts for the filter tiles.
     *
     * Each facet is counted with the *other* facet applied, so a tile always predicts
     * the number of rows clicking it will actually produce and users never land on a
     * zero-result dead end.
     *
     * @param  callable(): Builder<Event>  $scoped
     * @param  array{search: ?string, category: ?string, lifecycle: ?string, timing: ?string}  $filters
     * @return array{total: int, published: int, draft: int, upcoming: int, ongoing: int, past: int}
     */
    private function computeStats(callable $scoped, array $filters): array
    {
        return [
            'total' => $scoped()->count(),
            'published' => $scoped()->timing($filters['timing'])->lifecycle('published')->count(),
            'draft' => $scoped()->timing($filters['timing'])->lifecycle('draft')->count(),
            'upcoming' => $scoped()->lifecycle($filters['lifecycle'])->timing('upcoming')->count(),
            'ongoing' => $scoped()->lifecycle($filters['lifecycle'])->timing('ongoing')->count(),
            'past' => $scoped()->lifecycle($filters['lifecycle'])->timing('past')->count(),
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
        Gate::authorize('create', Event::class);

        $validated = $this->validated($request);

        // Taken from the session user, never from request input.
        $validated['organization_id'] = $request->user()->current_organization_id;

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
            'category' => ['required', Rule::in(Event::CATEGORIES)],
            'is_published' => ['required', 'boolean'],
            'start_date' => ['required', 'date'],
            'end_date' => ['required', 'date', 'after_or_equal:start_date'],
            'banner' => ['nullable', 'url'],
            'logo' => ['nullable', 'url'],
            'accent_color' => ['nullable', 'regex:/^#[0-9a-fA-F]{6}$/'],
            'instagram_url' => ['nullable', 'url'],
            'facebook_url' => ['nullable', 'url'],
            'youtube_url' => ['nullable', 'url'],
            'whatsapp_url' => ['nullable', 'url'],
        ], [
            'contact_person.regex' => 'Invalid E.164 format',
            'end_date.after_or_equal' => 'End date must be on or after the start date',
            'accent_color.regex' => 'Must be a hex color, e.g. #dc2626.',
        ]);
    }
}
