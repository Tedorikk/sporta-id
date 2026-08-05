<?php

use App\Models\Event;
use App\Models\Payment;
use App\Models\Registration;
use App\Models\RegistrationCategory;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    config(['services.midtrans.server_key' => 'test-server-key']);
});

function makePendingPayment(): array
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

function signedNotification(Payment $payment, string $status, ?string $fraudStatus = null): array
{
    $statusCode = '200';
    $grossAmount = $payment->amount;
    $signature = hash('sha512', $payment->order_id.$statusCode.$grossAmount.config('services.midtrans.server_key'));

    return array_filter([
        'order_id' => $payment->order_id,
        'status_code' => $statusCode,
        'gross_amount' => $grossAmount,
        'transaction_status' => $status,
        'fraud_status' => $fraudStatus,
        'transaction_id' => 'txn-123',
        'payment_type' => 'bank_transfer',
        'signature_key' => $signature,
    ], fn ($value) => $value !== null);
}

test('a valid settlement notification confirms the registration', function () {
    ['registration' => $registration, 'payment' => $payment] = makePendingPayment();

    $this->postJson(route('webhooks.midtrans'), signedNotification($payment, 'settlement'))
        ->assertOk();

    expect($registration->fresh()->status)->toBe(Registration::STATUS_CONFIRMED)
        ->and($registration->fresh()->expires_at)->toBeNull()
        ->and($payment->fresh()->status)->toBe(Payment::STATUS_SETTLEMENT)
        ->and($payment->fresh()->paid_at)->not->toBeNull()
        ->and($payment->fresh()->midtrans_transaction_id)->toBe('txn-123');
});

test('a capture notification with accepted fraud status confirms the registration', function () {
    ['registration' => $registration, 'payment' => $payment] = makePendingPayment();

    $this->postJson(route('webhooks.midtrans'), signedNotification($payment, 'capture', 'accept'))
        ->assertOk();

    expect($registration->fresh()->status)->toBe(Registration::STATUS_CONFIRMED);
});

test('a capture notification with denied fraud status rejects the registration', function () {
    ['category' => $category, 'registration' => $registration, 'payment' => $payment] = makePendingPayment();

    $this->postJson(route('webhooks.midtrans'), signedNotification($payment, 'capture', 'deny'))
        ->assertOk();

    expect($registration->fresh()->status)->toBe(Registration::STATUS_REJECTED)
        ->and($category->fresh()->registered_count)->toBe(0);
});

test('an invalid signature is rejected and changes nothing', function () {
    ['registration' => $registration, 'payment' => $payment] = makePendingPayment();

    $notification = signedNotification($payment, 'settlement');
    $notification['signature_key'] = 'tampered';

    $this->postJson(route('webhooks.midtrans'), $notification)->assertForbidden();

    expect($registration->fresh()->status)->toBe(Registration::STATUS_PENDING_PAYMENT)
        ->and($payment->fresh()->status)->toBe(Payment::STATUS_PENDING);
});

test('an expire notification releases quota', function () {
    ['category' => $category, 'registration' => $registration, 'payment' => $payment] = makePendingPayment();

    $this->postJson(route('webhooks.midtrans'), signedNotification($payment, 'expire'))->assertOk();

    expect($registration->fresh()->status)->toBe(Registration::STATUS_EXPIRED)
        ->and($category->fresh()->registered_count)->toBe(0);
});

test('a deny notification rejects the registration and releases quota', function () {
    ['category' => $category, 'registration' => $registration, 'payment' => $payment] = makePendingPayment();

    $this->postJson(route('webhooks.midtrans'), signedNotification($payment, 'deny'))->assertOk();

    expect($registration->fresh()->status)->toBe(Registration::STATUS_REJECTED)
        ->and($category->fresh()->registered_count)->toBe(0);
});

test('a pending notification does not change the registration', function () {
    ['registration' => $registration, 'payment' => $payment] = makePendingPayment();

    $this->postJson(route('webhooks.midtrans'), signedNotification($payment, 'pending'))->assertOk();

    expect($registration->fresh()->status)->toBe(Registration::STATUS_PENDING_PAYMENT);
});

test('a duplicate notification does not double-release quota', function () {
    ['category' => $category, 'payment' => $payment] = makePendingPayment();

    $this->postJson(route('webhooks.midtrans'), signedNotification($payment, 'expire'))->assertOk();
    $this->postJson(route('webhooks.midtrans'), signedNotification($payment, 'expire'))->assertOk();

    expect($category->fresh()->registered_count)->toBe(0);
});
