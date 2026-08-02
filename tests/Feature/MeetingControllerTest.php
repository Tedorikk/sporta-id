<?php

use App\Models\Event;
use App\Models\Meeting;
use App\Models\Speaker;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('guests cannot manage meetings', function () {
    $event = Event::factory()->create();

    $this->post(route('meetings.store', $event), ['title' => 'Keynote', 'scheduled_at' => now()->toDateTimeString()])
        ->assertRedirect(route('login'));

    expect(Meeting::count())->toBe(0);
});

test('an organizer can create a meeting with a speaker', function () {
    $user = User::factory()->create();
    $event = Event::factory()->create();
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
    $user = User::factory()->create();
    $event = Event::factory()->create();
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
    $user = User::factory()->create();
    $event = Event::factory()->create();
    $start = now()->addDay();

    $this->actingAs($user)
        ->post(route('meetings.store', $event), [
            'title' => 'Opening Keynote',
            'scheduled_at' => $start->toDateTimeString(),
            'ends_at' => $start->copy()->subHour()->toDateTimeString(),
        ])
        ->assertSessionHasErrors('ends_at');
});

test('an organizer can delete a meeting', function () {
    $user = User::factory()->create();
    $event = Event::factory()->create();
    $meeting = Meeting::create(['event_id' => $event->id, 'title' => 'Keynote', 'scheduled_at' => now()]);

    $this->actingAs($user)
        ->delete(route('meetings.destroy', [$event, $meeting]))
        ->assertRedirect(route('meetings.index', $event));

    expect(Meeting::find($meeting->id))->toBeNull();
});
