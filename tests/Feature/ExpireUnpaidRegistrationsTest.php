<?php

use App\Models\Event;
use App\Models\Registration;
use App\Models\RegistrationCategory;
use App\Models\RegistrationOrder;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

function makeCategoryWithRegistration(array $registrationOverrides = []): array
{
    $event = Event::factory()->create();

    $category = RegistrationCategory::create([
        'event_id' => $event->id,
        'name' => 'Paid Category',
        'subject_type' => RegistrationCategory::SUBJECT_INDIVIDUAL,
        'price' => '50000',
        'registration_open' => true,
        'registered_count' => 1,
        'form_pages' => [],
    ]);

    $registration = Registration::create(array_merge([
        'registration_category_id' => $category->id,
        'event_id' => $event->id,
        'name' => 'Overdue Registrant',
        'status' => Registration::STATUS_PENDING_PAYMENT,
    ], $registrationOverrides));

    return compact('category', 'registration');
}

test('an overdue pending-payment registration is expired and its quota released', function () {
    ['category' => $category, 'registration' => $registration] = makeCategoryWithRegistration([
        'expires_at' => now()->subHour(),
    ]);

    $this->artisan('registrations:expire-unpaid')->assertSuccessful();

    expect($registration->fresh()->status)->toBe(Registration::STATUS_EXPIRED)
        ->and($category->fresh()->registered_count)->toBe(0);
});

test('a non-overdue pending-payment registration is left alone', function () {
    ['category' => $category, 'registration' => $registration] = makeCategoryWithRegistration([
        'expires_at' => now()->addHour(),
    ]);

    $this->artisan('registrations:expire-unpaid')->assertSuccessful();

    expect($registration->fresh()->status)->toBe(Registration::STATUS_PENDING_PAYMENT)
        ->and($category->fresh()->registered_count)->toBe(1);
});

test('a confirmed registration is left alone', function () {
    ['registration' => $registration] = makeCategoryWithRegistration([
        'status' => Registration::STATUS_CONFIRMED,
        'expires_at' => null,
    ]);

    $this->artisan('registrations:expire-unpaid')->assertSuccessful();

    expect($registration->fresh()->status)->toBe(Registration::STATUS_CONFIRMED);
});

// ─── Group orders ────────────────────────────────────────────────────────────

test('an overdue pending-payment order is expired and every participant loses their slot', function () {
    $event = Event::factory()->create();

    $category = RegistrationCategory::create([
        'event_id' => $event->id,
        'name' => 'Paid Category',
        'subject_type' => RegistrationCategory::SUBJECT_INDIVIDUAL,
        'price' => '50000',
        'registration_open' => true,
        'registered_count' => 2,
        'form_pages' => [],
    ]);

    $order = RegistrationOrder::create([
        'event_id' => $event->id,
        'status' => RegistrationOrder::STATUS_PENDING_PAYMENT,
        'expires_at' => now()->subHour(),
    ]);

    $participants = collect(['Alpha', 'Beta'])->map(fn (string $name) => Registration::create([
        'registration_category_id' => $category->id,
        'registration_order_id' => $order->id,
        'event_id' => $event->id,
        'name' => $name,
        'status' => Registration::STATUS_PENDING_PAYMENT,
    ]));

    $order->payments()->create(['order_id' => 'ORD-TEST', 'amount' => 100000]);

    $this->artisan('registrations:expire-unpaid')->assertSuccessful();

    expect($order->fresh()->status)->toBe(RegistrationOrder::STATUS_EXPIRED)
        ->and($participants->map->fresh()->pluck('status')->unique()->all())->toBe([Registration::STATUS_EXPIRED])
        ->and($category->fresh()->registered_count)->toBe(0);
});

test('an order not yet past its expiry is left alone', function () {
    $event = Event::factory()->create();
    $category = RegistrationCategory::create([
        'event_id' => $event->id,
        'name' => 'Paid Category',
        'subject_type' => RegistrationCategory::SUBJECT_INDIVIDUAL,
        'price' => '50000',
        'registration_open' => true,
        'registered_count' => 1,
        'form_pages' => [],
    ]);
    $order = RegistrationOrder::create([
        'event_id' => $event->id,
        'status' => RegistrationOrder::STATUS_PENDING_PAYMENT,
        'expires_at' => now()->addHour(),
    ]);
    Registration::create([
        'registration_category_id' => $category->id,
        'registration_order_id' => $order->id,
        'event_id' => $event->id,
        'name' => 'Solo Runner',
        'status' => Registration::STATUS_PENDING_PAYMENT,
    ]);
    $order->payments()->create(['order_id' => 'ORD-TEST-2', 'amount' => 50000]);

    $this->artisan('registrations:expire-unpaid')->assertSuccessful();

    expect($order->fresh()->status)->toBe(RegistrationOrder::STATUS_PENDING_PAYMENT);
});
