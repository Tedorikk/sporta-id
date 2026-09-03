<?php

use App\Models\Event;
use App\Models\Meeting;
use App\Models\Speaker;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('guests cannot manage meetings', function () {
    $event = Event::factory()->create();

    $this->post(route('meetings.store', $event), ['title' => 'Keynote', 'scheduled_at' => now()->toDateTimeString()])
        ->assertRedirect(route('login'));

    expect(Meeting::count())->toBe(0);
});

test('an organizer can create a meeting with a speaker', function () {
    $event = Event::factory()->create();
    $user = organizerOf($event);
    $speaker = Speaker::create(['event_id' => $event->id, 'name' => 'Jane Speaker']);

    $this->actingAs($user)
        ->post(route('meetings.store', $event), [
            'title' => 'Opening Keynote',
            'speaker_id' => $speaker->id,
            'location' => 'Main Hall',
            'scheduled_at' => now()->addDay()->toDateTimeString(),
        ])
        ->assertRedirect(route('meetings.index', $event));

    $meeting = Meeting::firstOrFail();
    expect($meeting->title)->toBe('Opening Keynote')
        ->and($meeting->speaker_id)->toBe($speaker->id)
        ->and($meeting->location)->toBe('Main Hall');
});

test('a speaker from another event cannot be assigned to a meeting', function () {
    $event = Event::factory()->create();
    $user = organizerOf($event);
    $otherEvent = Event::factory()->create();
    $speaker = Speaker::create(['event_id' => $otherEvent->id, 'name' => 'Jane Speaker']);

    $this->actingAs($user)
        ->post(route('meetings.store', $event), [
            'title' => 'Opening Keynote',
            'speaker_id' => $speaker->id,
            'scheduled_at' => now()->addDay()->toDateTimeString(),
        ])
        ->assertSessionHasErrors('speaker_id');
});

test('ends_at must be after scheduled_at', function () {
    $event = Event::factory()->create();
    $user = organizerOf($event);
    $start = now()->addDay();

    $this->actingAs($user)
        ->post(route('meetings.store', $event), [
            'title' => 'Opening Keynote',
            'scheduled_at' => $start->toDateTimeString(),
            'ends_at' => $start->copy()->subHour()->toDateTimeString(),
        ])
        ->assertSessionHasErrors('ends_at');
});

test('guests cannot use the meeting search endpoint', function () {
    $this->getJson(route('meetings.search'))->assertUnauthorized();
});

test('an organizer can search meetings by title across events', function () {
    $event = Event::factory()->create();
    $user = organizerOf($event);
    // Same organization, so the search genuinely spans events rather than
    // appearing to only because the other event is invisible.
    $otherEvent = Event::factory()->create(['organization_id' => $event->organization_id]);
    Meeting::create(['event_id' => $event->id, 'title' => 'Opening Keynote', 'scheduled_at' => now()->addDay()]);
    Meeting::create(['event_id' => $otherEvent->id, 'title' => 'Closing Keynote', 'scheduled_at' => now()->addDays(2)]);

    $this->actingAs($user)
        ->getJson(route('meetings.search', ['q' => 'keynote']))
        ->assertOk()
        ->assertJsonCount(2);
});

test('the meeting search endpoint does not cross organizations', function () {
    $event = Event::factory()->create();
    $user = organizerOf($event);
    $foreignEvent = Event::factory()->create();
    Meeting::create(['event_id' => $event->id, 'title' => 'Opening Keynote', 'scheduled_at' => now()->addDay()]);
    Meeting::create(['event_id' => $foreignEvent->id, 'title' => 'Foreign Keynote', 'scheduled_at' => now()->addDays(2)]);

    $this->actingAs($user)
        ->getJson(route('meetings.search', ['q' => 'keynote']))
        ->assertOk()
        ->assertJsonCount(1)
        ->assertJsonPath('0.title', 'Opening Keynote');
});

test('the meeting search endpoint returns recent meetings when there is no query', function () {
    $event = Event::factory()->create();
    $user = organizerOf($event);
    Meeting::create(['event_id' => $event->id, 'title' => 'Session A', 'scheduled_at' => now()->addDay()]);
    Meeting::create(['event_id' => $event->id, 'title' => 'Session B', 'scheduled_at' => now()->addDays(2)]);

    $this->actingAs($user)
        ->getJson(route('meetings.search'))
        ->assertOk()
        ->assertJsonCount(2);
});

test('the meeting search endpoint caps results at 20', function () {
    $event = Event::factory()->create();
    $user = organizerOf($event);

    foreach (range(1, 25) as $i) {
        Meeting::create(['event_id' => $event->id, 'title' => "Session {$i}", 'scheduled_at' => now()->addHours($i)]);
    }

    $this->actingAs($user)
        ->getJson(route('meetings.search'))
        ->assertOk()
        ->assertJsonCount(20);
});

test('an organizer can delete a meeting', function () {
    $event = Event::factory()->create();
    $user = organizerOf($event);
    $meeting = Meeting::create(['event_id' => $event->id, 'title' => 'Keynote', 'scheduled_at' => now()]);

    $this->actingAs($user)
        ->delete(route('meetings.destroy', [$event, $meeting]))
        ->assertRedirect(route('meetings.index', $event));

    expect(Meeting::find($meeting->id))->toBeNull();
});
