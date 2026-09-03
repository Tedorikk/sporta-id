<?php

use App\Models\Event;
use App\Models\Meeting;
use App\Models\Speaker;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('guests cannot manage speakers', function () {
    $event = Event::factory()->create();

    $this->post(route('speakers.store', $event), ['name' => 'Jane Speaker'])
        ->assertRedirect(route('login'));

    expect(Speaker::count())->toBe(0);
});

test('an organizer can create, update, and delete a speaker', function () {
    $event = Event::factory()->create();
    $user = organizerOf($event);

    $this->actingAs($user)
        ->post(route('speakers.store', $event), ['name' => 'Jane Speaker', 'title' => 'CTO, Acme'])
        ->assertRedirect(route('speakers.index', $event));

    $speaker = Speaker::firstOrFail();
    expect($speaker->name)->toBe('Jane Speaker')->and($speaker->title)->toBe('CTO, Acme');

    $this->actingAs($user)
        ->put(route('speakers.update', [$event, $speaker]), ['name' => 'Jane Renamed'])
        ->assertRedirect(route('speakers.index', $event));

    expect($speaker->fresh()->name)->toBe('Jane Renamed');

    $this->actingAs($user)
        ->delete(route('speakers.destroy', [$event, $speaker]))
        ->assertRedirect(route('speakers.index', $event));

    expect(Speaker::find($speaker->id))->toBeNull();
});

test('a speaker with meetings assigned cannot be deleted', function () {
    $event = Event::factory()->create();
    $user = organizerOf($event);
    $speaker = Speaker::create(['event_id' => $event->id, 'name' => 'Jane Speaker']);
    Meeting::create(['event_id' => $event->id, 'speaker_id' => $speaker->id, 'title' => 'Keynote', 'scheduled_at' => now()]);

    $this->actingAs($user)
        ->delete(route('speakers.destroy', [$event, $speaker]))
        ->assertRedirect(route('speakers.index', $event));

    expect(Speaker::find($speaker->id))->not->toBeNull();
});
