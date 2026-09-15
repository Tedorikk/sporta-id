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
