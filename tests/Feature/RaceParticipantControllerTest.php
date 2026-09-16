<?php

use App\Models\Event;
use App\Models\RaceParticipant;
use App\Models\RegistrationCategory;
use App\Models\RunningEventCategory;
use Inertia\Testing\AssertableInertia;

/**
 * A distance with a linked sign-up form, which is how a real race is set up:
 * runners buy an entry, and the entry becomes a place on the start list.
 */
function raceDistance(Event $event, array $attributes = []): RunningEventCategory
{
    $distance = RunningEventCategory::factory()->forEvent($event)->create([
        'name' => '10K',
        'distance_meters' => 10000,
        'bib_start_number' => 101,
        ...$attributes,
    ]);

    RegistrationCategory::factory()->forDistance($distance)->paid()->create(['name' => '10K Entry']);

    return $distance;
}

function registerRunner(RunningEventCategory $distance, string $name, string $status = 'confirmed'): void
{
    $registrationCategory = $distance->registrationCategories()->firstOrFail();

    $registrationCategory->registrations()->create([
        'event_id' => $registrationCategory->event_id,
        'name' => $name,
        'email' => str($name)->slug().'@example.com',
        'phone' => '+6281234567890',
        'status' => $status,
    ]);
}

test('the start list is visible to an organizer', function () {
    $event = Event::factory()->running()->create();
    $distance = raceDistance($event);
    RaceParticipant::factory()->create([
        'running_event_category_id' => $distance->id,
        'name' => 'Nadia Putri',
        'bib_number' => '101',
    ]);
    $user = organizerOf($event);

    $this->actingAs($user)
        ->get(route('race_participants.index', [$event, $distance]))
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->component('dashboard/events/running/participants/index')
            ->has('participants', 1)
            ->where('participants.0.name', 'Nadia Putri')
            ->where('summary.total', 1)
            ->where('summary.unnumbered', 0)
            ->where('next_bib', '102')
        );
});

test('assigning bibs puts confirmed registrants on the start list and numbers them', function () {
    $event = Event::factory()->running()->create();
    $distance = raceDistance($event);
    registerRunner($distance, 'Nadia Putri');
    registerRunner($distance, 'Bagus Wicaksono');
    registerRunner($distance, 'Unpaid Runner', 'pending_payment');
    $user = organizerOf($event);

    $this->actingAs($user)
        ->post(route('race_bibs.assign', [$event, $distance]))
        ->assertRedirect();

    $participants = $distance->participants()->orderBy('id')->get();

    expect($participants)->toHaveCount(2)
        ->and($participants->pluck('name')->all())->toBe(['Nadia Putri', 'Bagus Wicaksono'])
        ->and($participants->pluck('bib_number')->all())->toBe(['101', '102'])
        ->and($participants->first()->email)->toBe('nadia-putri@example.com');
});

test('re-assigning keeps existing bibs and only numbers the newcomers', function () {
    $event = Event::factory()->running()->create();
    $distance = raceDistance($event);
    registerRunner($distance, 'Nadia Putri');
    $user = organizerOf($event);

    $this->actingAs($user)->post(route('race_bibs.assign', [$event, $distance]));

    $first = $distance->participants()->firstOrFail();
    expect($first->bib_number)->toBe('101');

    registerRunner($distance, 'Late Entry');

    $this->actingAs($user)->post(route('race_bibs.assign', [$event, $distance]));

    expect($first->fresh()->bib_number)->toBe('101')
        ->and($distance->participants()->where('name', 'Late Entry')->value('bib_number'))->toBe('102');
});

test('assignment skips bib numbers that are already taken', function () {
    $event = Event::factory()->running()->create();
    $distance = raceDistance($event, ['bib_prefix' => 'A']);
    RaceParticipant::factory()->create([
        'running_event_category_id' => $distance->id,
        'name' => 'Elite Invitee',
        'bib_number' => 'A101',
    ]);
    registerRunner($distance, 'Nadia Putri');
    $user = organizerOf($event);

    $this->actingAs($user)->post(route('race_bibs.assign', [$event, $distance]));

    expect($distance->participants()->where('name', 'Nadia Putri')->value('bib_number'))->toBe('A102');
});

test('a distance with no sign-up form still numbers its walk-ins', function () {
    $event = Event::factory()->running()->create();
    $distance = RunningEventCategory::factory()->forEvent($event)->create([
        'bib_start_number' => 1,
    ]);
    RaceParticipant::factory()->create([
        'running_event_category_id' => $distance->id,
        'bib_number' => null,
    ]);
    $user = organizerOf($event);

    $this->actingAs($user)->post(route('race_bibs.assign', [$event, $distance]));

    expect($distance->participants()->first()->bib_number)->toBe('1');
});

test('an organizer can add, edit, and remove a walk-in runner', function () {
    $event = Event::factory()->running()->create();
    $distance = raceDistance($event);
    $user = organizerOf($event);

    $this->actingAs($user)
        ->post(route('race_participants.store', [$event, $distance]), [
            'name' => 'Race Day Walk-in',
            'bib_number' => '900',
        ])
        ->assertRedirect();

    $participant = RaceParticipant::firstOrFail();

    expect($participant->name)->toBe('Race Day Walk-in')
        ->and($participant->registration_id)->toBeNull()
        ->and($participant->status)->toBe(RaceParticipant::STATUS_REGISTERED);

    $this->actingAs($user)
        ->put(route('race_participants.update', [$event, $distance, $participant]), [
            'name' => 'Race Day Walk-in',
            'bib_number' => '901',
        ])
        ->assertRedirect();

    expect($participant->fresh()->bib_number)->toBe('901');

    $this->actingAs($user)
        ->delete(route('race_participants.destroy', [$event, $distance, $participant]))
        ->assertRedirect();

    expect(RaceParticipant::count())->toBe(0);
});

test('two runners on the same distance cannot share a bib number', function () {
    $event = Event::factory()->running()->create();
    $distance = raceDistance($event);
    RaceParticipant::factory()->create([
        'running_event_category_id' => $distance->id,
        'bib_number' => '101',
    ]);
    $user = organizerOf($event);

    $this->actingAs($user)
        ->post(route('race_participants.store', [$event, $distance]), [
            'name' => 'Duplicate Bib',
            'bib_number' => '101',
        ])
        ->assertInvalid('bib_number');

    expect(RaceParticipant::count())->toBe(1);
});

test('the same bib number may be reused on a different distance', function () {
    $event = Event::factory()->running()->create();
    $tenK = raceDistance($event);
    $fiveK = RunningEventCategory::factory()->create([
        'running_event_id' => $event->eventable_id,
        'name' => '5K',
        'distance_meters' => 5000,
    ]);
    RaceParticipant::factory()->create([
        'running_event_category_id' => $tenK->id,
        'bib_number' => '101',
    ]);
    $user = organizerOf($event);

    $this->actingAs($user)
        ->post(route('race_participants.store', [$event, $fiveK]), [
            'name' => 'Other Distance',
            'bib_number' => '101',
        ])
        ->assertRedirect();

    expect(RaceParticipant::count())->toBe(2);
});

test('a runner cannot be reached through a distance they do not belong to', function () {
    $event = Event::factory()->running()->create();
    $distance = raceDistance($event);
    $otherDistance = RunningEventCategory::factory()->create([
        'running_event_id' => $event->eventable_id,
    ]);
    $participant = RaceParticipant::factory()->create([
        'running_event_category_id' => $otherDistance->id,
    ]);
    $user = organizerOf($event);

    $this->actingAs($user)
        ->delete(route('race_participants.destroy', [$event, $distance, $participant]))
        ->assertNotFound();

    expect(RaceParticipant::count())->toBe(1);
});

test('guests cannot see or change a start list', function () {
    $event = Event::factory()->running()->create();
    $distance = raceDistance($event);

    $this->get(route('race_participants.index', [$event, $distance]))->assertRedirect(route('login'));
    $this->post(route('race_bibs.assign', [$event, $distance]))->assertRedirect(route('login'));
});
