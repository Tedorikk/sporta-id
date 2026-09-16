<?php

use App\Models\Event;
use App\Models\RaceParticipant;
use App\Models\RegistrationCategory;
use App\Models\RunningEventCategory;
use Inertia\Testing\AssertableInertia;

function publishedRace(): Event
{
    $event = Event::factory()->running()->create(['is_published' => true]);

    $distance = RunningEventCategory::factory()->create([
        'running_event_id' => $event->eventable_id,
        'name' => '10K',
        'distance_meters' => 10000,
    ]);

    RaceParticipant::factory()->finished(2892)->create([
        'running_event_category_id' => $distance->id,
        'name' => 'Nadia Putri',
        'bib_number' => '101',
    ]);

    RaceParticipant::factory()->create([
        'running_event_category_id' => $distance->id,
        'name' => 'Bagus Wicaksono',
        'bib_number' => '102',
        'status' => RaceParticipant::STATUS_DNF,
    ]);

    return $event;
}

test('a race hides its results until they are published', function () {
    $event = publishedRace();

    $this->get(route('events.public.show', $event))
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->component('events/show')
            ->where('raceResults', null)
        );
});

test('published results appear on the public event page', function () {
    $event = publishedRace();
    $event->specific->update(['results_published' => true]);

    $this->get(route('events.public.show', $event))
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->component('events/show')
            ->has('raceResults', 1)
            ->where('raceResults.0.name', '10K')
            ->has('raceResults.0.rankings', 1)
            ->where('raceResults.0.rankings.0.name', 'Nadia Putri')
            ->where('raceResults.0.rankings.0.duration_seconds', 2892)
            ->has('raceResults.0.unranked', 1)
            ->where('raceResults.0.unranked.0.status', 'dnf')
        );
});

test('a basketball event carries no race results', function () {
    $event = Event::factory()->create(['is_published' => true]);

    $this->get(route('events.public.show', $event))
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page) => $page->where('raceResults', null));
});

test('closing entries on a race closes every distance sign-up form', function () {
    $event = Event::factory()->running()->create(['is_published' => true]);
    $registrationCategory = RegistrationCategory::create([
        'event_id' => $event->id,
        'name' => '10K Entry',
        'subject_type' => RegistrationCategory::SUBJECT_INDIVIDUAL,
        'price' => 150000,
    ]);
    RunningEventCategory::factory()->create([
        'running_event_id' => $event->eventable_id,
        'registration_category_id' => $registrationCategory->id,
    ]);

    expect($registrationCategory->fresh()->isOpen())->toBeTrue();

    $event->specific->update(['registration_open' => false]);

    expect($registrationCategory->fresh()->isOpen())->toBeFalse();

    $this->get(route('registrations.create', [$event, $registrationCategory]))
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page) => $page->where('registrationClosed', true));

    $this->post(route('registrations.store', [$event, $registrationCategory]), [
        'name' => 'Too Late',
        'email' => 'late@example.com',
    ])->assertForbidden();
});

test('the event page hands the dashboard its distances', function () {
    $event = Event::factory()->running()->create();
    $distance = RunningEventCategory::factory()->create([
        'running_event_id' => $event->eventable_id,
        'name' => '10K',
        'distance_meters' => 10000,
    ]);
    RaceParticipant::factory()->finished(2892)->create([
        'running_event_category_id' => $distance->id,
    ]);
    RaceParticipant::factory()->create([
        'running_event_category_id' => $distance->id,
    ]);
    $user = organizerOf($event);

    $this->actingAs($user)
        ->get(route('events.show', $event))
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->component('dashboard/events/show')
            ->where('event.specific_type', 'RunningEvent')
            ->has('event.running_categories', 1)
            ->where('event.running_categories.0.participants_count', 2)
            ->where('event.running_categories.0.finishers_count', 1)
            ->has('event.registration_category_options')
        );
});
