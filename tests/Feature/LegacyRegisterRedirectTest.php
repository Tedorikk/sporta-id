<?php

use App\Models\BasketballEventCategory;
use App\Models\Event;
use App\Models\RegistrationCategory;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

// /events/{event}/register is the URL people guess, bookmark, and print. The
// basketball-only form that used to live here is gone; the URL now sends
// visitors to wherever the event actually takes registrations.

test('the register URL redirects straight to the form when an event sells exactly one category', function () {
    $event = Event::factory()->create(['is_published' => true]);
    $category = RegistrationCategory::factory()->individual()->for($event)->create();

    $this->get(route('events.public.register', $event))
        ->assertRedirect(route('registrations.create', [$event, $category]));
});

test('a basketball event with one open tournament category goes straight to its form too', function () {
    $event = Event::factory()->basketball()->create();
    $tournament = BasketballEventCategory::factory()->forEvent($event)->create();

    $this->get(route('events.public.register', $event))
        ->assertRedirect(route('registrations.create', [$event, $tournament->registrationCategory]));
});

test('the register URL redirects to the event page when several categories are open', function () {
    $event = Event::factory()->create(['is_published' => true]);
    RegistrationCategory::factory()->count(2)->for($event)->create();

    $this->get(route('events.public.register', $event))
        ->assertRedirect(route('events.public.show', $event));
});

test('the register URL redirects to the event page when every category is closed or full', function () {
    $event = Event::factory()->create(['is_published' => true]);
    RegistrationCategory::factory()->for($event)->create(['quota' => 1, 'registered_count' => 1]);
    RegistrationCategory::factory()->closed()->for($event)->create();

    $this->get(route('events.public.register', $event))
        ->assertRedirect(route('events.public.show', $event));
});

test('the register URL redirects to the event page for an event with no registration at all', function () {
    $event = Event::factory()->create(['is_published' => true]);

    $this->get(route('events.public.register', $event))
        ->assertRedirect(route('events.public.show', $event));
});

test('the legacy player form no longer accepts submissions', function () {
    $event = Event::factory()->basketball()->create();

    $this->post("/events/{$event->id}/register", ['name' => 'Jane Doe'])
        ->assertMethodNotAllowed();
});
