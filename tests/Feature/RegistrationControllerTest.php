<?php

use App\Models\Event;
use App\Models\Registration;
use App\Models\RegistrationCategory;
use App\Models\Team;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

function makeRegistrationCategory(array $overrides = []): RegistrationCategory
{
    $event = Event::factory()->create();

    return RegistrationCategory::create(array_merge([
        'event_id' => $event->id,
        'name' => '5K Run',
        'subject_type' => RegistrationCategory::SUBJECT_INDIVIDUAL,
        'price' => null,
        'quota' => null,
        'registration_open' => true,
        'form_schema' => [
            ['key' => 'email', 'label' => 'Email', 'type' => 'email', 'required' => true],
            ['key' => 'shirt_size', 'label' => 'Shirt Size', 'type' => 'select', 'required' => true, 'options' => ['S', 'M', 'L']],
        ],
    ], $overrides));
}

// ─── Public form (create) ───────────────────────────────────────────────────

test('the dynamic registration form loads when the category is open', function () {
    $category = makeRegistrationCategory();

    $this->get(route('registrations.create', [$category->event, $category]))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('register-dynamic')
            ->where('registrationClosed', false)
        );
});

test('the dynamic registration form reports closed when the category is closed', function () {
    $category = makeRegistrationCategory(['registration_open' => false]);

    $this->get(route('registrations.create', [$category->event, $category]))
        ->assertOk()
        ->assertInertia(fn ($page) => $page->where('registrationClosed', true));
});

test('the dynamic registration form reports closed when quota is full', function () {
    $category = makeRegistrationCategory(['quota' => 1, 'registered_count' => 1]);

    $this->get(route('registrations.create', [$category->event, $category]))
        ->assertOk()
        ->assertInertia(fn ($page) => $page->where('registrationClosed', true));
});

// ─── Public form (store) — dynamic field validation ─────────────────────────

test('a required dynamic field must be present', function () {
    $category = makeRegistrationCategory();

    $this->post(route('registrations.store', [$category->event, $category]), [
        'name' => 'Jane Doe',
        'email' => 'jane@example.com',
        // shirt_size missing
    ])->assertSessionHasErrors('form_data.shirt_size');
});

test('a select field rejects a value outside its options', function () {
    $category = makeRegistrationCategory();

    $this->post(route('registrations.store', [$category->event, $category]), [
        'name' => 'Jane Doe',
        'email' => 'jane@example.com',
        'form_data' => ['shirt_size' => 'XXL'],
    ])->assertSessionHasErrors('form_data.shirt_size');
});

test('an email-typed field rejects an invalid email', function () {
    $category = makeRegistrationCategory();

    $this->post(route('registrations.store', [$category->event, $category]), [
        'name' => 'Jane Doe',
        'email' => 'not-an-email',
        'form_data' => ['shirt_size' => 'M'],
    ])->assertSessionHasErrors('email');
});

test('a valid submission creates a confirmed registration and stores form_data', function () {
    $category = makeRegistrationCategory();

    $this->post(route('registrations.store', [$category->event, $category]), [
        'name' => 'Jane Doe',
        'email' => 'jane@example.com',
        'form_data' => ['shirt_size' => 'M'],
    ])->assertRedirect();

    $registration = Registration::where('name', 'Jane Doe')->firstOrFail();

    expect($registration->status)->toBe(Registration::STATUS_CONFIRMED)
        ->and($registration->email)->toBe('jane@example.com')
        ->and($registration->form_data)->toBe(['shirt_size' => 'M'])
        ->and($registration->team_id)->toBeNull()
        ->and($category->fresh()->registered_count)->toBe(1);
});

test('a team-subject category also creates a team', function () {
    $category = makeRegistrationCategory([
        'subject_type' => RegistrationCategory::SUBJECT_TEAM,
        'form_schema' => [],
    ]);

    $this->post(route('registrations.store', [$category->event, $category]), [
        'name' => 'Team Alpha',
    ])->assertRedirect();

    $registration = Registration::where('name', 'Team Alpha')->firstOrFail();

    expect($registration->team_id)->not->toBeNull();
    expect(Team::find($registration->team_id)->name)->toBe('Team Alpha');
});

// ─── Quota enforcement ───────────────────────────────────────────────────────

test('registration is rejected once quota is reached', function () {
    $category = makeRegistrationCategory(['quota' => 1, 'form_schema' => []]);

    $this->post(route('registrations.store', [$category->event, $category]), ['name' => 'First'])
        ->assertRedirect();

    $this->post(route('registrations.store', [$category->event, $category]), ['name' => 'Second'])
        ->assertForbidden();

    expect(Registration::count())->toBe(1);
});

test('registration is rejected once the category is closed', function () {
    $category = makeRegistrationCategory(['registration_open' => false, 'form_schema' => []]);

    $this->post(route('registrations.store', [$category->event, $category]), ['name' => 'Someone'])
        ->assertForbidden();

    expect(Registration::count())->toBe(0);
});
