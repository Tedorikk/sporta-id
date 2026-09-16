<?php

use App\Models\Event;
use App\Models\RegistrationCategory;
use App\Models\RunningEvent;
use App\Models\RunningEventCategory;

test('an event can be set up as a race', function () {
    $event = Event::factory()->create(['category' => Event::CATEGORY_RUNNING]);
    $user = organizerOf($event);

    $this->actingAs($user)
        ->post(route('events.running.store', $event))
        ->assertRedirect();

    $event->refresh();

    expect($event->specific)->toBeInstanceOf(RunningEvent::class)
        ->and($event->specific->registration_open)->toBeTrue()
        ->and($event->specific->results_published)->toBeFalse();
});

test('setting up a race twice leaves the original in place', function () {
    $event = Event::factory()->running()->create();
    $user = organizerOf($event);
    $originalId = $event->eventable_id;

    $this->actingAs($user)
        ->post(route('events.running.store', $event))
        ->assertRedirect();

    expect($event->fresh()->eventable_id)->toBe($originalId)
        ->and(RunningEvent::count())->toBe(1);
});

test('registration and result publication can be toggled independently', function () {
    $event = Event::factory()->running()->create();
    $user = organizerOf($event);

    $this->actingAs($user)
        ->put(route('events.running.update', $event), ['registration_open' => false])
        ->assertRedirect();

    expect($event->fresh()->specific->registration_open)->toBeFalse()
        ->and($event->fresh()->specific->results_published)->toBeFalse();

    $this->actingAs($user)
        ->put(route('events.running.update', $event), ['results_published' => true])
        ->assertRedirect();

    expect($event->fresh()->specific->results_published)->toBeTrue()
        ->and($event->fresh()->specific->registration_open)->toBeFalse();
});

test('an organizer can create, update, and delete a distance', function () {
    $event = Event::factory()->running()->create();
    $user = organizerOf($event);

    $this->actingAs($user)
        ->post(route('running_categories.store', $event), [
            'name' => 'Half Marathon',
            'distance_meters' => 21097,
            'bib_start_number' => 500,
            'bib_start_female' => 3000,
            'minimum_age' => 17,
        ])
        ->assertRedirect();

    $category = RunningEventCategory::firstOrFail();

    expect($category->name)->toBe('Half Marathon')
        ->and($category->distance_meters)->toBe(21097)
        ->and($category->bib_start_number)->toBe(500)
        ->and($category->bib_start_male)->toBeNull()
        ->and($category->bib_start_female)->toBe(3000)
        ->and($category->minimum_age)->toBe(17)
        ->and($category->slug)->toStartWith('half-marathon-')
        ->and($category->running_event_id)->toBe($event->eventable_id);

    $this->actingAs($user)
        ->put(route('running_categories.update', [$event, $category]), [
            'name' => 'Half Marathon (21K)',
            'distance_meters' => 21097,
            'bib_start_number' => 500,
            'cutoff_minutes' => 210,
        ])
        ->assertRedirect();

    expect($category->fresh()->name)->toBe('Half Marathon (21K)')
        ->and($category->fresh()->cutoff_minutes)->toBe(210);

    $this->actingAs($user)
        ->delete(route('running_categories.destroy', [$event, $category]))
        ->assertRedirect();

    expect(RunningEventCategory::find($category->id))->toBeNull();
});

test('a distance that registration categories still sell cannot be deleted', function () {
    $event = Event::factory()->running()->create();
    $distance = RunningEventCategory::factory()->forEvent($event)->create();
    RegistrationCategory::factory()->forDistance($distance)->create();
    $user = organizerOf($event);

    $this->actingAs($user)
        ->delete(route('running_categories.destroy', [$event, $distance]))
        ->assertRedirect()
        ->assertSessionHas('toast.variant', 'destructive');

    expect(RunningEventCategory::find($distance->id))->not->toBeNull();
});

test('distances cannot be managed on an event that is not a race', function () {
    $event = Event::factory()->create();
    $user = organizerOf($event);

    $this->actingAs($user)
        ->post(route('running_categories.store', $event), [
            'name' => '10K',
            'distance_meters' => 10000,
            'bib_start_number' => 1,
        ])
        ->assertNotFound();
});

test('a distance from another event cannot be edited through this one', function () {
    $event = Event::factory()->running()->create();
    $otherEvent = Event::factory()->running()->create();
    $foreignDistance = RunningEventCategory::factory()->create([
        'running_event_id' => $otherEvent->eventable_id,
    ]);
    $user = organizerOf($event);

    $this->actingAs($user)
        ->delete(route('running_categories.destroy', [$event, $foreignDistance]))
        ->assertNotFound();

    expect(RunningEventCategory::find($foreignDistance->id))->not->toBeNull();
});

test('guests cannot manage distances', function () {
    $event = Event::factory()->running()->create();
    $category = RunningEventCategory::factory()->create([
        'running_event_id' => $event->eventable_id,
    ]);

    $this->post(route('running_categories.store', $event), [])->assertRedirect(route('login'));
    $this->delete(route('running_categories.destroy', [$event, $category]))->assertRedirect(route('login'));

    expect(RunningEventCategory::count())->toBe(1);
});

test('running is an accepted event category and unknown categories are rejected', function () {
    $event = Event::factory()->create();
    $user = organizerOf($event);

    $payload = [
        'name' => 'Sporta Night Run',
        'contact_person' => '+6281234567890',
        'is_published' => true,
        'start_date' => now()->addWeek()->format('Y-m-d'),
        'end_date' => now()->addWeek()->addDay()->format('Y-m-d'),
    ];

    $this->actingAs($user)
        ->post(route('events.store'), [...$payload, 'category' => Event::CATEGORY_RUNNING])
        ->assertRedirect(route('events.index'));

    expect(Event::where('category', Event::CATEGORY_RUNNING)->count())->toBe(1);

    $this->actingAs($user)
        ->post(route('events.store'), [...$payload, 'category' => 'PADEL'])
        ->assertInvalid('category');
});
