<?php

use App\Jobs\ProcessPaymentEffect;
use App\Jobs\ProcessPaymentWebhook;
use App\Mail\RegistrationConfirmed;
use App\Models\Payment;
use App\Models\PaymentEffect;
use App\Models\PaymentWebhookReceipt;
use App\Models\Registration;
use App\Models\RegistrationCategory;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Bus;
use Illuminate\Support\Facades\Mail;

uses(RefreshDatabase::class);

function recoveryPaymentAndEffect(array $effectOverrides = []): array
{
    $category = RegistrationCategory::factory()->paid(150000)->create(['registered_count' => 1]);
    $registration = Registration::factory()->forCategory($category)->create([
        'status' => Registration::STATUS_CONFIRMED,
        'expires_at' => null,
    ]);
    $payment = $registration->payments()->create([
        'order_id' => 'ORD-EFFECT-123',
        'amount' => 150000,
        'currency' => 'IDR',
        'status' => Payment::STATUS_SETTLEMENT,
        'provider' => Payment::PROVIDER_XENDIT,
        'checkout_state' => Payment::CHECKOUT_CLOSED,
        'fulfillment_state' => Payment::FULFILLMENT_FULFILLED,
        'paid_at' => now(),
    ]);
    $effect = PaymentEffect::create(array_merge([
        'payment_id' => $payment->id,
        'payable_type' => Registration::class,
        'payable_id' => $registration->id,
        'effect_type' => 'confirmation_email',
        'effect_key' => "{$payment->id}|confirmation_email|{$registration->id}",
        'payload' => [
            'payable_type' => Registration::class,
            'payable_id' => $registration->id,
            'payment_id' => $payment->id,
        ],
        'state' => 'pending',
    ], $effectOverrides));

    return [$payment, $registration, $effect];
}

test('it replays a pending effect and marks it completed', function () {
    Mail::fake();
    [, , $effect] = recoveryPaymentAndEffect();

    (new ProcessPaymentEffect($effect))->handle();

    expect($effect->fresh()->state)->toBe('completed')
        ->and($effect->fresh()->completed_at)->not->toBeNull();

    Mail::assertQueued(RegistrationConfirmed::class);
});

test('completed effects are idempotent and not sent again', function () {
    Mail::fake();
    [, , $effect] = recoveryPaymentAndEffect([
        'state' => 'completed',
        'completed_at' => now(),
    ]);

    (new ProcessPaymentEffect($effect))->handle();

    expect($effect->fresh()->attempts)->toBe(0);
    Mail::assertNothingQueued();
});

test('webhook replay dispatches retryable receipts', function () {
    Bus::fake();
    $receipt = PaymentWebhookReceipt::create([
        'provider' => Payment::PROVIDER_XENDIT,
        'provider_account_id' => 'business-123',
        'provider_mode' => 'test',
        'event_type' => 'payment_session.completed',
        'session_id' => 'ps-replay',
        'reference_id' => 'ORD-REPLAY',
        'dedupe_key' => 'xendit|business-123|ps-replay|payment_session.completed|COMPLETED',
        'payload_digest' => hash('sha256', 'replay'),
        'sanitized_payload' => ['event' => 'payment_session.completed', 'data' => []],
        'processing_state' => 'failed',
        'processing_attempts' => 1,
        'received_at' => now(),
    ]);

    $this->artisan('payments:replay-webhooks', ['--receipt' => $receipt->id])
        ->assertSuccessful();

    expect($receipt->fresh()->processing_state)->toBe('received');
    Bus::assertDispatched(ProcessPaymentWebhook::class);
});

test('pending payment effect dispatch command requeues retryable effects', function () {
    Bus::fake();
    [, , $effect] = recoveryPaymentAndEffect([
        'state' => 'failed',
        'attempts' => 1,
        'error_message' => 'mail outage',
    ]);

    $this->artisan('payments:dispatch-effects', ['--effect' => $effect->id])
        ->assertSuccessful();

    expect($effect->fresh()->state)->toBe('pending');
    Bus::assertDispatched(ProcessPaymentEffect::class);
});
