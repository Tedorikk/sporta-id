<?php

use App\Models\Event;
use App\Models\RegistrationCategory;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('the public event page lists open registration categories with available quota', function () {
    $event = Event::factory()->create(['is_published' => true]);

    $open = RegistrationCategory::create([
        'event_id' => $event->id,
        'name' => '5K Run',
        'subject_type' => RegistrationCategory::SUBJECT_INDIVIDUAL,
        'price' => '150000',
        'registration_open' => true,
        'form_schema' => [],
    ]);

    $this->get(route('events.public.show', $event))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('events/show')
            ->has('registrationCategories', 1)
            ->where('registrationCategories.0.id', $open->id)
        );
});

test('a closed registration category is not listed on the public event page', function () {
    $event = Event::factory()->create(['is_published' => true]);

    RegistrationCategory::create([
        'event_id' => $event->id,
        'name' => 'Closed Category',
        'subject_type' => RegistrationCategory::SUBJECT_INDIVIDUAL,
        'registration_open' => false,
        'form_schema' => [],
    ]);

    $this->get(route('events.public.show', $event))
        ->assertOk()
        ->assertInertia(fn ($page) => $page->has('registrationCategories', 0));
});

test('a full registration category is not listed on the public event page', function () {
    $event = Event::factory()->create(['is_published' => true]);

    RegistrationCategory::create([
        'event_id' => $event->id,
        'name' => 'Full Category',
        'subject_type' => RegistrationCategory::SUBJECT_INDIVIDUAL,
        'registration_open' => true,
        'quota' => 1,
        'registered_count' => 1,
        'form_schema' => [],
    ]);

    $this->get(route('events.public.show', $event))
        ->assertOk()
        ->assertInertia(fn ($page) => $page->has('registrationCategories', 0));
});
