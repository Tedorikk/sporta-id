<?php

use App\Models\Event;
use App\Models\Payment;
use App\Models\PaymentRefundRecord;
use App\Models\Registration;
use App\Models\RegistrationCategory;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

function settledRegistration(): Registration
{
    $event = Event::factory()->create(['is_published' => true]);

    $category = RegistrationCategory::create([
        'event_id' => $event->id,
        'name' => '5K Run',
        'subject_type' => RegistrationCategory::SUBJECT_INDIVIDUAL,
        'price' => '150000',
        'quota' => 50,
        'registered_count' => 1,
        'form_pages' => [],
    ]);

    $registration = Registration::create([
        'registration_category_id' => $category->id,
        'event_id' => $event->id,
        'name' => 'Budi Santoso',
        'email' => 'budi@example.com',
        'status' => Registration::STATUS_CONFIRMED,
        'form_data' => [],
    ]);

    Payment::create([
        'payable_type' => Registration::class,
        'payable_id' => $registration->id,
        'order_id' => 'REG-'.$registration->id.'-ABC123',
        'amount' => 150000,
        'status' => Payment::STATUS_SETTLEMENT,
        'payment_type' => 'bank_transfer',
        'paid_at' => now(),
    ]);

    return $registration;
}

test('an organizer can record a refund, which cancels and releases the slot', function () {
    $registration = settledRegistration();
    $user = organizerOf($registration->event);

    $this->actingAs($user)
        ->post(route('registrations.refund', [$registration->event, $registration]), ['note' => 'Cancelled 40 days out'])
        ->assertRedirect();

    expect($registration->fresh()->status)->toBe(Registration::STATUS_CANCELLED)
        ->and($registration->payments()->first()->status)->toBe(Payment::STATUS_REFUND)
        // The slot goes back to the pool so it can be resold.
        ->and($registration->registrationCategory->fresh()->registered_count)->toBe(0);
});

test('the recorded refund keeps who did it and why', function () {
    $registration = settledRegistration();
    $user = organizerOf($registration->event);

    $this->actingAs($user)
        ->post(route('registrations.refund', [$registration->event, $registration]), ['note' => 'Duplicate charge']);

    $refund = PaymentRefundRecord::where('registration_id', $registration->id)->first();

    expect($refund->refunded_by)->toBe($user->id)
        ->and($refund->refund_note)->toBe('Duplicate charge')
        ->and($refund->refunded_at)->not->toBeNull();
});

test('refunding twice does not release the quota twice', function () {
    $registration = settledRegistration();
    $user = organizerOf($registration->event);

    $this->actingAs($user)->post(route('registrations.refund', [$registration->event, $registration]));

    $this->actingAs($user)
        ->post(route('registrations.refund', [$registration->event, $registration]))
        ->assertStatus(422);

    expect($registration->registrationCategory->fresh()->registered_count)->toBe(0);
});

test('a registration with no settled payment cannot be refunded', function () {
    $registration = settledRegistration();
    $registration->payments()->update(['status' => Payment::STATUS_PENDING]);
    $user = organizerOf($registration->event);

    $this->actingAs($user)
        ->post(route('registrations.refund', [$registration->event, $registration]))
        ->assertStatus(422);

    expect($registration->fresh()->status)->toBe(Registration::STATUS_CONFIRMED);
});

test('a guest cannot record a refund', function () {
    $registration = settledRegistration();

    $this->post(route('registrations.refund', [$registration->event, $registration]))
        ->assertRedirect(route('login'));

    expect($registration->fresh()->status)->toBe(Registration::STATUS_CONFIRMED);
});

test('an organizer from another organization cannot record a refund', function () {
    $registration = settledRegistration();
    $outsider = organizerOf(Event::factory()->create());

    // EventPolicy denies as not-found on purpose, so an event in another
    // organization isn't even discoverable.
    $this->actingAs($outsider)
        ->post(route('registrations.refund', [$registration->event, $registration]))
        ->assertNotFound();

    expect($registration->fresh()->status)->toBe(Registration::STATUS_CONFIRMED);
});

test('the organizer table exposes each registration payment', function () {
    $registration = settledRegistration();
    $user = organizerOf($registration->event);

    $this->actingAs($user)
        ->get(route('registration_categories.show', [$registration->event, $registration->registrationCategory]))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('registrations.data.0.payment.status', Payment::STATUS_SETTLEMENT)
            ->where('registrations.data.0.payment.order_id', 'REG-'.$registration->id.'-ABC123')
        );
});
