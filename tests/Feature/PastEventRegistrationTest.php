<?php

use App\Models\Event;
use App\Models\Registration;
use App\Models\RegistrationCategory;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

function pastEventCategory(): RegistrationCategory
{
    $event = Event::factory()->create([
        'is_published' => true,
        'start_date' => now()->subDays(10)->toDateString(),
        'end_date' => now()->subDays(3)->toDateString(),
    ]);

    return RegistrationCategory::factory()->individual()->for($event)->create();
}

test('a category on an event that has ended is closed whatever its own switch says', function () {
    $category = pastEventCategory();

    expect($category->registration_open)->toBeTrue()
        ->and($category->isOpen())->toBeFalse()
        ->and($category->toPublicArray()['is_available'])->toBeFalse()
        ->and($category->toPublicArray()['unavailable_reason'])->toBe('ended');
});

test('the event page lists an ended event\'s categories as ended', function () {
    $category = pastEventCategory();

    $this->get(route('events.public.show', $category->event))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('registrationCategories.0.is_available', false)
            ->where('registrationCategories.0.unavailable_reason', 'ended'));
});

test('the registration form reports closed and refuses submissions after the event', function () {
    $category = pastEventCategory();

    $this->get(route('registrations.create', [$category->event, $category]))
        ->assertOk()
        ->assertInertia(fn ($page) => $page->where('registrationClosed', true));

    $this->post(route('registrations.store', [$category->event, $category]), ['name' => 'Too Late'])
        ->assertForbidden();

    expect(Registration::count())->toBe(0);
});

test('the day the event ends still counts as open', function () {
    $event = Event::factory()->create([
        'is_published' => true,
        'start_date' => now()->subDays(2)->toDateString(),
        'end_date' => now()->toDateString(),
    ]);
    $category = RegistrationCategory::factory()->individual()->for($event)->create();

    expect($category->isOpen())->toBeTrue()
        ->and($category->toPublicArray()['unavailable_reason'])->toBeNull();
});

test('the public category payload does not carry the event along', function () {
    $category = pastEventCategory();

    expect($category->toPublicArray())->not->toHaveKey('event');
});

// ─── Organiser override ─────────────────────────────────────────────────────

test('the after-end override reopens registration on an ended event', function () {
    $category = pastEventCategory();
    $category->event->update(['registration_after_end' => true]);
    $category->refresh();

    expect($category->isOpen())->toBeTrue()
        ->and($category->toPublicArray()['is_available'])->toBeTrue()
        ->and($category->toPublicArray()['unavailable_reason'])->toBeNull();

    $this->post(route('registrations.store', [$category->event, $category]), ['name' => 'Late Entry'])
        ->assertOk();

    expect(Registration::count())->toBe(1);
});

test('the override does not bypass the category\'s own switch', function () {
    $category = pastEventCategory();
    $category->event->update(['registration_after_end' => true]);
    $category->update(['registration_open' => false]);

    expect($category->fresh()->isOpen())->toBeFalse()
        ->and($category->fresh()->toPublicArray()['unavailable_reason'])->toBe('closed');
});

test('an organiser can set the override from the event form', function () {
    $category = pastEventCategory();
    $event = $category->event;

    $this->actingAs(organizerOf($event))
        ->put(route('events.update', $event), [
            'name' => $event->name,
            'description' => $event->description,
            'contact_person' => '+6281234567890',
            'category' => 'BASKETBALL',
            'is_published' => true,
            'registration_after_end' => true,
            'start_date' => $event->start_date->toDateString(),
            'end_date' => $event->end_date->toDateString(),
        ])
        ->assertRedirect();

    expect($event->fresh()->registration_after_end)->toBeTrue()
        ->and($category->fresh()->isOpen())->toBeTrue();
});
