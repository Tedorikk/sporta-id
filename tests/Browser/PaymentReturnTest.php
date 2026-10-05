<?php

use App\Models\Payment;
use App\Models\Registration;
use App\Models\RegistrationCategory;

test('a user returning from a successful payment sees the confirmed status', function () {
    $category = RegistrationCategory::factory()->paid(150000)->create([
        'payment_method' => RegistrationCategory::PAYMENT_METHOD_ONLINE,
    ]);

    $registration = Registration::factory()->create([
        'event_id' => $category->event_id,
        'registration_category_id' => $category->id,
        'status' => Registration::STATUS_CONFIRMED,
    ]);

    // Simulate returning to the success URL
    $this->visit(route('registrations.status', [$registration->event, $registration->qr_token]))
        ->assertSee('Confirmed')
        ->assertDontSee('Pay Now');
});

test('a user returning from a canceled payment sees the pending status and can try again', function () {
    $category = RegistrationCategory::factory()->paid(150000)->create([
        'payment_method' => RegistrationCategory::PAYMENT_METHOD_ONLINE,
    ]);

    $registration = Registration::factory()->create([
        'event_id' => $category->event_id,
        'registration_category_id' => $category->id,
        'status' => Registration::STATUS_PENDING_PAYMENT,
    ]);

    // Suppose the payment was marked as expired/canceled via webhook or status check
    $payment = $registration->payments()->create([
        'order_id' => 'ORD-123',
        'amount' => 150000,
        'currency' => 'IDR',
        'status' => Payment::STATUS_EXPIRE,
        'provider' => 'xendit',
        'checkout_state' => Payment::CHECKOUT_CLOSED,
    ]);

    // They return to the status page
    $this->visit(route('registrations.status', [$registration->event, $registration->qr_token]))
        ->assertSee('Pay Now'); // The retry button should be present
});
