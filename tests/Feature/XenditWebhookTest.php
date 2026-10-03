<?php

use App\Jobs\ProcessPaymentWebhook;
use App\Models\Payment;
use App\Models\PaymentWebhookReceipt;
use App\Models\Registration;
use App\Models\RegistrationCategory;
use App\Services\Payments\PaymentReconciler;
use App\Services\Xendit\XenditStatusMapper;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Bus;

uses(RefreshDatabase::class);

function xenditPayload(array $overrides = []): array
{
    $data = array_merge([
        'payment_session_id' => 'ps-123',
        'reference_id' => 'ORD-XENDIT-123',
        'status' => 'COMPLETED',
        'amount' => 150000,
        'currency' => 'IDR',
        'country' => 'ID',
        'session_type' => 'PAY',
        'payment_id' => 'pay-123',
        'payment_request_id' => 'pr-123',
        'updated' => '2026-10-04T10:00:00Z',
    ], $overrides['data'] ?? []);

    unset($overrides['data']);

    return array_merge([
        'event' => 'payment_session.completed',
        'business_id' => 'business-123',
        'created' => '2026-10-04T10:00:01Z',
        'data' => $data,
    ], $overrides);
}

function createXenditPayment(array $overrides = []): Payment
{
    $category = RegistrationCategory::factory()->paid(150000)->create(['registered_count' => 1]);
    $registration = Registration::factory()->forCategory($category)->create();

    return $registration->payments()->create(array_merge([
        'order_id' => 'ORD-XENDIT-123',
        'amount' => 150000,
        'currency' => 'IDR',
        'status' => Payment::STATUS_PENDING,
        'provider' => Payment::PROVIDER_XENDIT,
        'provider_account_id' => 'business-123',
        'provider_session_id' => 'ps-123',
        'checkout_state' => Payment::CHECKOUT_READY,
        'checkout_expires_at' => now()->addMinutes(30),
    ], $overrides));
}

beforeEach(function () {
    config([
        'services.xendit.webhook_token' => 'webhook-secret',
        'services.xendit.business_id' => 'business-123',
        'services.xendit.mode' => 'test',
    ]);
});

test('it persists and queues a valid webhook delivery', function () {
    Bus::fake();

    $this->postJson(route('webhooks.xendit'), xenditPayload(), [
        'x-callback-token' => 'webhook-secret',
    ])->assertOk();

    $receipt = PaymentWebhookReceipt::sole();

    expect($receipt->event_type)->toBe('payment_session.completed')
        ->and($receipt->session_id)->toBe('ps-123')
        ->and($receipt->reference_id)->toBe('ORD-XENDIT-123')
        ->and($receipt->processing_state)->toBe('received');

    Bus::assertDispatched(ProcessPaymentWebhook::class);
});

test('it rejects webhook deliveries with invalid authentication', function () {
    Bus::fake();

    $this->postJson(route('webhooks.xendit'), xenditPayload(), [
        'x-callback-token' => 'wrong-secret',
    ])->assertForbidden();

    expect(PaymentWebhookReceipt::count())->toBe(0);
    Bus::assertNotDispatched(ProcessPaymentWebhook::class);
});

test('it deduplicates repeated webhook deliveries', function () {
    Bus::fake();
    $payload = xenditPayload();

    $this->postJson(route('webhooks.xendit'), $payload, [
        'x-callback-token' => 'webhook-secret',
    ])->assertOk();
    $this->postJson(route('webhooks.xendit'), $payload, [
        'x-callback-token' => 'webhook-secret',
    ])->assertOk();

    expect(PaymentWebhookReceipt::count())->toBe(1);
    Bus::assertDispatched(ProcessPaymentWebhook::class, 1);
});

test('it rejects malformed webhook payloads before persistence', function () {
    Bus::fake();

    $this->postJson(route('webhooks.xendit'), [
        'event' => 'payment_session.completed',
    ], [
        'x-callback-token' => 'webhook-secret',
    ])->assertUnprocessable();

    expect(PaymentWebhookReceipt::count())->toBe(0);
    Bus::assertNotDispatched(ProcessPaymentWebhook::class);
});

test('processing marks unknown payment webhooks as unmatched', function () {
    $receipt = PaymentWebhookReceipt::create([
        'provider' => Payment::PROVIDER_XENDIT,
        'provider_account_id' => 'business-123',
        'provider_mode' => 'test',
        'event_type' => 'payment_session.completed',
        'session_id' => 'missing-session',
        'reference_id' => 'missing-reference',
        'dedupe_key' => 'xendit|business-123|missing-session|payment_session.completed|COMPLETED',
        'payload_digest' => hash('sha256', 'missing'),
        'sanitized_payload' => xenditPayload([
            'data' => [
                'payment_session_id' => 'missing-session',
                'reference_id' => 'missing-reference',
            ],
        ]),
        'received_at' => now(),
    ]);

    (new ProcessPaymentWebhook($receipt))->handle(
        app(XenditStatusMapper::class),
        app(PaymentReconciler::class),
    );

    expect($receipt->fresh()->processing_state)->toBe('unmatched')
        ->and($receipt->fresh()->processing_error)->toContain('No payment found');
});

test('processing quarantines mismatched amount webhooks', function () {
    createXenditPayment(['amount' => 150000]);
    $receipt = PaymentWebhookReceipt::create([
        'provider' => Payment::PROVIDER_XENDIT,
        'provider_account_id' => 'business-123',
        'provider_mode' => 'test',
        'event_type' => 'payment_session.completed',
        'session_id' => 'ps-123',
        'reference_id' => 'ORD-XENDIT-123',
        'dedupe_key' => 'xendit|business-123|ps-123|payment_session.completed|COMPLETED',
        'payload_digest' => hash('sha256', 'mismatch'),
        'sanitized_payload' => xenditPayload(['data' => ['amount' => 999999]]),
        'received_at' => now(),
    ]);

    (new ProcessPaymentWebhook($receipt))->handle(
        app(XenditStatusMapper::class),
        app(PaymentReconciler::class),
    );

    expect($receipt->fresh()->processing_state)->toBe('failed')
        ->and($receipt->fresh()->processing_error)->toContain('Amount mismatch')
        ->and(Payment::sole()->status)->toBe(Payment::STATUS_PENDING);
});
