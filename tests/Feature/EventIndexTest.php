<?php

use App\Models\Event;
use App\Models\Organization;
use App\Models\RegistrationCategory;

/**
 * Seeds one event per lifecycle/timing combination so the facets can be tested
 * independently of each other.
 */
function seedFacetMatrix(Organization $organization): void
{
    $matrix = [
        ['published' => true, 'start' => '+5 days', 'end' => '+6 days'],
        ['published' => true, 'start' => '-1 day', 'end' => '+1 day'],
        ['published' => true, 'start' => '-10 days', 'end' => '-9 days'],
        ['published' => false, 'start' => '+5 days', 'end' => '+6 days'],
        ['published' => false, 'start' => '-10 days', 'end' => '-9 days'],
    ];

    foreach ($matrix as $row) {
        Event::factory()->for($organization)->create([
            'is_published' => $row['published'],
            'start_date' => now()->modify($row['start'])->format('Y-m-d'),
            'end_date' => now()->modify($row['end'])->format('Y-m-d'),
        ]);
    }
}

it('defaults to the table view sorted by start date descending', function () {
    $organization = Organization::factory()->create();
    $user = memberOf($organization);
    Event::factory()->for($organization)->create();

    $this->actingAs($user)
        ->get(route('events.index'))
        ->assertInertia(fn ($page) => $page
            ->component('dashboard/events/index')
            ->where('view', 'table')
            ->where('sort.column', 'start_date')
            ->where('sort.direction', 'desc')
            ->where('events.per_page', 25)
        );
});

it('combines the lifecycle and timing facets', function () {
    $organization = Organization::factory()->create();
    $user = memberOf($organization);
    seedFacetMatrix($organization);

    $this->actingAs($user)
        ->get(route('events.index', ['lifecycle' => 'draft', 'timing' => 'upcoming']))
        ->assertInertia(fn ($page) => $page
            ->where('filters.lifecycle', 'draft')
            ->where('filters.timing', 'upcoming')
            ->has('events.data', 1)
            ->where('events.data.0.is_published', false)
            ->where('events.data.0.status', 'upcoming')
        );
});

it('counts each facet against the other facet so no tile is a dead end', function () {
    $organization = Organization::factory()->create();
    $user = memberOf($organization);
    seedFacetMatrix($organization);

    // With timing=upcoming applied, the publication counts describe upcoming events only.
    $this->actingAs($user)
        ->get(route('events.index', ['timing' => 'upcoming']))
        ->assertInertia(fn ($page) => $page
            ->where('stats.published', 1)
            ->where('stats.draft', 1)
            // Timing counts ignore the timing filter itself, so the other tiles stay reachable.
            ->where('stats.upcoming', 2)
            ->where('stats.ongoing', 1)
            ->where('stats.past', 2)
        );

    // With lifecycle=draft applied, the timing counts describe drafts only.
    $this->actingAs($user)
        ->get(route('events.index', ['lifecycle' => 'draft']))
        ->assertInertia(fn ($page) => $page
            ->where('stats.upcoming', 1)
            ->where('stats.ongoing', 0)
            ->where('stats.past', 1)
            ->where('stats.published', 3)
            ->where('stats.draft', 2)
        );
});

it('sorts by a whitelisted column and falls back on anything else', function () {
    $organization = Organization::factory()->create();
    $user = memberOf($organization);
    Event::factory()->for($organization)->create(['name' => 'Zulu Cup']);
    Event::factory()->for($organization)->create(['name' => 'Alpha Cup']);

    $this->actingAs($user)
        ->get(route('events.index', ['sort' => 'name', 'direction' => 'asc']))
        ->assertInertia(fn ($page) => $page
            ->where('sort.column', 'name')
            ->where('events.data.0.name', 'Alpha Cup')
        );

    $this->actingAs($user)
        ->get(route('events.index', ['sort' => 'contact_person', 'direction' => 'sideways']))
        ->assertInertia(fn ($page) => $page
            ->where('sort.column', 'start_date')
            ->where('sort.direction', 'desc')
        );
});

it('reports whether the organization has any events, regardless of filters', function () {
    $organization = Organization::factory()->create();
    $user = memberOf($organization);

    $this->actingAs($user)
        ->get(route('events.index'))
        ->assertInertia(fn ($page) => $page->where('has_any_events', false));

    Event::factory()->for($organization)->create(['name' => 'Only Event']);

    $this->actingAs($user)
        ->get(route('events.index', ['search' => 'no such event']))
        ->assertInertia(fn ($page) => $page
            ->has('events.data', 0)
            ->where('has_any_events', true)
        );
});

it('exposes the attendee count the table column renders', function () {
    $organization = Organization::factory()->create();
    $user = memberOf($organization);
    Event::factory()->for($organization)->create();

    $this->actingAs($user)
        ->get(route('events.index'))
        ->assertInertia(fn ($page) => $page->where('events.data.0.attendees_count', 0));
});

it('keeps the grid view at nine per page', function () {
    $organization = Organization::factory()->create();
    $user = memberOf($organization);
    Event::factory()->for($organization)->create();

    $this->actingAs($user)
        ->get(route('events.index', ['view' => 'grid']))
        ->assertInertia(fn ($page) => $page
            ->where('view', 'grid')
            ->where('events.per_page', 9)
        );
});

it('exposes the ticket types and price range the quick-view panel shows', function () {
    $organization = Organization::factory()->create();
    $user = memberOf($organization);
    $event = Event::factory()->for($organization)->create();

    foreach ([50000, 150000] as $price) {
        RegistrationCategory::create([
            'event_id' => $event->id,
            'name' => "Pass {$price}",
            'subject_type' => RegistrationCategory::SUBJECT_INDIVIDUAL,
            'price' => $price,
            'form_pages' => [],
        ]);
    }

    $this->actingAs($user)
        ->get(route('events.index'))
        ->assertInertia(fn ($page) => $page
            ->where('events.data.0.registration_categories_count', 2)
            ->where('events.data.0.price_from', fn ($price) => (float) $price === 50000.0)
            ->where('events.data.0.price_to', fn ($price) => (float) $price === 150000.0)
        );
});

it('keeps filters and ordering on the second page', function () {
    $organization = Organization::factory()->create();
    $user = memberOf($organization);

    // 30 published events, named so alphabetical order is predictable.
    foreach (range(1, 30) as $index) {
        Event::factory()->for($organization)->create([
            'name' => 'Cup '.str_pad((string) $index, 2, '0', STR_PAD_LEFT),
            'is_published' => true,
        ]);
    }
    Event::factory()->for($organization)->create(['name' => 'Draft Cup', 'is_published' => false]);

    $this->actingAs($user)
        ->get(route('events.index', [
            'lifecycle' => 'published',
            'sort' => 'name',
            'direction' => 'asc',
            'page' => 2,
        ]))
        ->assertInertia(fn ($page) => $page
            ->where('events.current_page', 2)
            ->where('events.last_page', 2)
            ->where('events.total', 30)
            ->has('events.data', 5)
            // Page 2 continues the same ordering rather than restarting it.
            ->where('events.data.0.name', 'Cup 26')
            ->where('filters.lifecycle', 'published')
            ->where('sort.column', 'name')
        );
});
