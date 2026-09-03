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
        'form_pages' => [],
    ]);

    $this->get(route('events.public.show', $event))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('events/show')
            ->has('registrationCategories', 1)
            ->where('registrationCategories.0.id', $open->id)
            ->where('registrationCategories.0.is_available', true)
            ->where('registrationCategories.0.unavailable_reason', null)
        );
});

test('a closed registration category is still listed, marked unavailable', function () {
    $event = Event::factory()->create(['is_published' => true]);

    RegistrationCategory::create([
        'event_id' => $event->id,
        'name' => 'Closed Category',
        'subject_type' => RegistrationCategory::SUBJECT_INDIVIDUAL,
        'price' => '75000',
        'registration_open' => false,
        'form_pages' => [],
    ]);

    $this->get(route('events.public.show', $event))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->has('registrationCategories', 1)
            ->where('registrationCategories.0.is_available', false)
            ->where('registrationCategories.0.unavailable_reason', 'closed')
            // The price stays visible even when the category can't be bought —
            // that's the whole point of still listing it.
            ->where('registrationCategories.0.price', '75000.00')
        );
});

test('a full registration category is still listed, marked sold out', function () {
    $event = Event::factory()->create(['is_published' => true]);

    RegistrationCategory::create([
        'event_id' => $event->id,
        'name' => 'Full Category',
        'subject_type' => RegistrationCategory::SUBJECT_INDIVIDUAL,
        'registration_open' => true,
        'quota' => 1,
        'registered_count' => 1,
        'form_pages' => [],
    ]);

    $this->get(route('events.public.show', $event))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->has('registrationCategories', 1)
            ->where('registrationCategories.0.is_available', false)
            ->where('registrationCategories.0.unavailable_reason', 'full')
            ->where('registrationCategories.0.slots_left', 0)
        );
});

test('an open category reports how many slots are left', function () {
    $event = Event::factory()->create(['is_published' => true]);

    RegistrationCategory::create([
        'event_id' => $event->id,
        'name' => 'Limited',
        'subject_type' => RegistrationCategory::SUBJECT_INDIVIDUAL,
        'registration_open' => true,
        'quota' => 50,
        'registered_count' => 8,
        'form_pages' => [],
    ]);

    $this->get(route('events.public.show', $event))
        ->assertOk()
        ->assertInertia(fn ($page) => $page->where('registrationCategories.0.slots_left', 42));
});

test('the public events index exposes a price range for each event', function () {
    $event = Event::factory()->create(['is_published' => true]);

    foreach ([100000, 250000] as $price) {
        RegistrationCategory::create([
            'event_id' => $event->id,
            'name' => "Category {$price}",
            'subject_type' => RegistrationCategory::SUBJECT_INDIVIDUAL,
            'price' => (string) $price,
            'form_pages' => [],
        ]);
    }

    $this->get(route('events.public.index'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('events/index')
            ->where('events.data.0.price_from', fn ($value) => (float) $value === 100000.0)
            ->where('events.data.0.price_to', fn ($value) => (float) $value === 250000.0)
        );
});

test('the landing page exposes a price range for each published event', function () {
    $event = Event::factory()->create(['is_published' => true]);

    RegistrationCategory::create([
        'event_id' => $event->id,
        'name' => 'Solo',
        'subject_type' => RegistrationCategory::SUBJECT_INDIVIDUAL,
        'price' => '150000',
        'form_pages' => [],
    ]);

    $this->get(route('home'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('landing')
            ->where('events.0.price_from', fn ($value) => (float) $value === 150000.0)
        );
});

test('the landing page lists each event with its purchasable categories and prices', function () {
    $event = Event::factory()->create(['is_published' => true]);

    RegistrationCategory::create([
        'event_id' => $event->id,
        'name' => 'Open Category',
        'subject_type' => RegistrationCategory::SUBJECT_INDIVIDUAL,
        'price' => '150000',
        'registration_open' => true,
        'form_pages' => [],
    ]);

    RegistrationCategory::create([
        'event_id' => $event->id,
        'name' => 'Sold Out Category',
        'subject_type' => RegistrationCategory::SUBJECT_TEAM,
        'price' => '400000',
        'registration_open' => true,
        'quota' => 4,
        'registered_count' => 4,
        'form_pages' => [],
    ]);

    $this->get(route('home'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('landing')
            // Both are listed with a price; only one is buyable right now.
            ->has('events.0.registration_categories', 2)
            ->where('events.0.registration_categories.0.name', 'Open Category')
            ->where('events.0.registration_categories.0.price', '150000.00')
            ->where('events.0.registration_categories.0.is_available', true)
            ->where('events.0.registration_categories.1.price', '400000.00')
            ->where('events.0.registration_categories.1.is_available', false)
            ->where('events.0.registration_categories.1.unavailable_reason', 'full')
        );
});
