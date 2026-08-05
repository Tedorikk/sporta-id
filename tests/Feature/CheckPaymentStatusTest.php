<?php

use App\Models\Event;
use App\Models\Payment;
use App\Models\Registration;
use App\Models\RegistrationCategory;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;

uses(RefreshDatabase::class);

function makeUnreconciledPendingPayment(): array
{
    $event = Event::factory()->create();

    $category = RegistrationCategory::create([
        'event_id' => $event->id,
        'name' => 'Paid Category',
        'subject_type' => RegistrationCategory::SUBJECT_INDIVIDUAL,
        'price' => '100000',
        'registration_open' => true,
        'registered_count' => 1,
        'form_schema' => [],
    ]);

    $registration = Registration::create([
        'registration_category_id' => $category->id,
        'event_id' => $event->id,
        'name' => 'Jane Doe',
        'status' => Registration::STATUS_PENDING_PAYMENT,
        'expires_at' => now()->addDay(),
    ]);

    $payment = Payment::create([
        'registration_id' => $registration->id,
        'order_id' => 'REG-'.$registration->id.'-test',
        'amount' => '100000.00',
    ]);

    return compact('event', 'category', 'registration', 'payment');
}

test('the command confirms a registration whose payment actually settled', function () {
    ['registration' => $registration, 'payment' => $payment] = makeUnreconciledPendingPayment();

    Http::fake([
        "api.sandbox.midtrans.com/v2/{$payment->order_id}/status" => Http::response([
            'order_id' => $payment->order_id,
            'transaction_status' => 'settlement',
            'transaction_id' => 'txn-999',
            'payment_type' => 'gopay',
        ], 200),
    ]);

    $this->artisan('payments:check-status', ['registration' => $registration->id])
        ->assertSuccessful();

    expect($registration->fresh()->status)->toBe(Registration::STATUS_CONFIRMED)
        ->and($payment->fresh()->status)->toBe(Payment::STATUS_SETTLEMENT)
        ->and($payment->fresh()->midtrans_transaction_id)->toBe('txn-999');
});

test('the command leaves a still-pending transaction alone', function () {
    ['registration' => $registration, 'payment' => $payment] = makeUnreconciledPendingPayment();

    Http::fake([
        "api.sandbox.midtrans.com/v2/{$payment->order_id}/status" => Http::response([
            'order_id' => $payment->order_id,
            'transaction_status' => 'pending',
        ], 200),
    ]);

    $this->artisan('payments:check-status', ['registration' => $registration->id])
        ->assertSuccessful();

    expect($registration->fresh()->status)->toBe(Registration::STATUS_PENDING_PAYMENT);
});

test('the command fails for an unknown registration', function () {
    $this->artisan('payments:check-status', ['registration' => 999999])
        ->assertFailed();
});

test('the command fails when the registration has no payment on record', function () {
    $event = Event::factory()->create();

    $category = RegistrationCategory::create([
        'event_id' => $event->id,
        'name' => 'No Payment Category',
        'subject_type' => RegistrationCategory::SUBJECT_INDIVIDUAL,
        'registration_open' => true,
        'form_schema' => [],
    ]);

    $registration = Registration::create([
        'registration_category_id' => $category->id,
        'event_id' => $event->id,
        'name' => 'No Payment',
        'status' => Registration::STATUS_PENDING_PAYMENT,
    ]);

    $this->artisan('payments:check-status', ['registration' => $registration->id])
        ->assertFailed();
});
