<?php

use App\Mail\RegistrationConfirmed;
use App\Mail\RegistrationReceived;
use App\Models\Event;
use App\Models\Payment;
use App\Models\Registration;
use App\Models\RegistrationCategory;
use App\Services\Midtrans\PaymentReconciler;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Mail;

uses(RefreshDatabase::class);

/** Local to this file — Pest helpers defined in another test file aren't shared. */
function paidFlowCategory(array $overrides = []): RegistrationCategory
{
    $event = Event::factory()->create(['is_published' => true]);

    return RegistrationCategory::create(array_merge([
        'event_id' => $event->id,
        'name' => '5K Run',
        'subject_type' => RegistrationCategory::SUBJECT_INDIVIDUAL,
        'price' => null,
        'registration_open' => true,
        'form_pages' => [
            ['key' => 'page-1', 'title' => 'Details', 'fields' => [
                ['key' => 'shirt_size', 'label' => 'Shirt Size', 'type' => 'select', 'required' => true, 'options' => ['S', 'M']],
            ]],
        ],
    ], $overrides));
}

// ─── A paid category must collect an email ─────────────────────────────────

test('a paid registration is rejected without an email', function () {
    $category = paidFlowCategory([
        'price' => '150000',
        'form_pages' => [
            ['key' => 'page-1', 'title' => 'Details', 'fields' => [
                ['key' => 'shirt_size', 'label' => 'Shirt Size', 'type' => 'select', 'required' => true, 'options' => ['S', 'M']],
            ]],
        ],
    ]);

    $this->post(route('registrations.store', [$category->event, $category]), [
        'name' => 'Budi Santoso',
        'form_data' => ['shirt_size' => 'M'],
    ])->assertSessionHasErrors('email');

    expect(Registration::count())->toBe(0);
});

test('email is required on a paid category even when the organizer marked it optional', function () {
    $category = paidFlowCategory([
        'price' => '150000',
        'form_pages' => [
            ['key' => 'page-1', 'title' => 'Details', 'fields' => [
                ['key' => 'email', 'label' => 'Email', 'type' => 'email', 'required' => false],
            ]],
        ],
    ]);

    $this->post(route('registrations.store', [$category->event, $category]), [
        'name' => 'Budi Santoso',
    ])->assertSessionHasErrors('email');
});

test('a free category still does not force an email', function () {
    $category = paidFlowCategory([
        'price' => null,
        'form_pages' => [
            ['key' => 'page-1', 'title' => 'Details', 'fields' => [
                ['key' => 'shirt_size', 'label' => 'Shirt Size', 'type' => 'select', 'required' => true, 'options' => ['S', 'M']],
            ]],
        ],
    ]);

    $this->post(route('registrations.store', [$category->event, $category]), [
        'name' => 'Budi Santoso',
        'form_data' => ['shirt_size' => 'M'],
    ])->assertOk();

    expect(Registration::where('name', 'Budi Santoso')->exists())->toBeTrue();
});

// ─── The registrant actually gets told ─────────────────────────────────────

test('a free registration emails the registrant a confirmation', function () {
    Mail::fake();

    // A free category only captures an email if the organizer asked for one —
    // unlike a paid category, where the server adds the requirement itself.
    $category = paidFlowCategory([
        'form_pages' => [
            ['key' => 'page-1', 'title' => 'Details', 'fields' => [
                ['key' => 'email', 'label' => 'Email', 'type' => 'email', 'required' => true],
                ['key' => 'shirt_size', 'label' => 'Shirt Size', 'type' => 'select', 'required' => true, 'options' => ['S', 'M']],
            ]],
        ],
    ]);

    $this->post(route('registrations.store', [$category->event, $category]), [
        'name' => 'Budi Santoso',
        'email' => 'budi@example.com',
        'form_data' => ['shirt_size' => 'M'],
    ])->assertOk();

    Mail::assertQueued(RegistrationConfirmed::class, fn ($mail) => $mail->hasTo('budi@example.com'));
});

test('settlement emails the registrant and notifies the organizers', function () {
    Mail::fake();
    Http::fake(['app.sandbox.midtrans.com/snap/v1/transactions' => Http::response(['token' => 'snap-token-abc'], 201)]);

    $category = paidFlowCategory([
        'price' => '150000',
        'form_settings' => ['notify_emails' => ['organizer@example.com']],
    ]);

    $this->post(route('registrations.store', [$category->event, $category]), [
        'name' => 'Budi Santoso',
        'email' => 'budi@example.com',
        'form_data' => ['shirt_size' => 'M'],
    ])->assertOk();

    $registration = Registration::where('name', 'Budi Santoso')->firstOrFail();

    // Nothing goes out while the payment is still pending.
    Mail::assertNothingQueued();

    $payment = Payment::where('registration_id', $registration->id)->firstOrFail();

    app(PaymentReconciler::class)->reconcile($payment, [
        'order_id' => $payment->order_id,
        'transaction_status' => 'settlement',
        'transaction_id' => 'txn-1',
        'payment_type' => 'bank_transfer',
    ]);

    expect($registration->fresh()->status)->toBe(Registration::STATUS_CONFIRMED);

    Mail::assertQueued(RegistrationConfirmed::class, fn ($mail) => $mail->hasTo('budi@example.com'));
    Mail::assertQueued(RegistrationReceived::class, fn ($mail) => $mail->hasTo('organizer@example.com'));
});

test('a replayed settlement webhook does not send the confirmation twice', function () {
    Mail::fake();
    Http::fake(['app.sandbox.midtrans.com/snap/v1/transactions' => Http::response(['token' => 'snap-token-abc'], 201)]);

    $category = paidFlowCategory(['price' => '150000']);

    $this->post(route('registrations.store', [$category->event, $category]), [
        'name' => 'Budi Santoso',
        'email' => 'budi@example.com',
        'form_data' => ['shirt_size' => 'M'],
    ])->assertOk();

    $payment = Payment::firstOrFail();
    $notification = [
        'order_id' => $payment->order_id,
        'transaction_status' => 'settlement',
        'transaction_id' => 'txn-1',
        'payment_type' => 'bank_transfer',
    ];

    app(PaymentReconciler::class)->reconcile($payment, $notification);
    app(PaymentReconciler::class)->reconcile($payment->fresh(), $notification);

    Mail::assertQueued(RegistrationConfirmed::class, 1);
});

test('an expired payment tells nobody it was confirmed', function () {
    Mail::fake();
    Http::fake(['app.sandbox.midtrans.com/snap/v1/transactions' => Http::response(['token' => 'snap-token-abc'], 201)]);

    $category = paidFlowCategory(['price' => '150000']);

    $this->post(route('registrations.store', [$category->event, $category]), [
        'name' => 'Budi Santoso',
        'email' => 'budi@example.com',
        'form_data' => ['shirt_size' => 'M'],
    ])->assertOk();

    $payment = Payment::firstOrFail();

    app(PaymentReconciler::class)->reconcile($payment, [
        'order_id' => $payment->order_id,
        'transaction_status' => 'expire',
    ]);

    Mail::assertNotQueued(RegistrationConfirmed::class);
    expect(Registration::firstOrFail()->status)->toBe(Registration::STATUS_EXPIRED);
});

// ─── Midtrans gets a real email to send its own receipt to ─────────────────

test('the email collected is forwarded to midtrans as customer_details', function () {
    Http::fake(['app.sandbox.midtrans.com/snap/v1/transactions' => Http::response(['token' => 'snap-token-abc'], 201)]);

    $category = paidFlowCategory(['price' => '150000']);

    $this->post(route('registrations.store', [$category->event, $category]), [
        'name' => 'Budi Santoso',
        'email' => 'budi@example.com',
        'form_data' => ['shirt_size' => 'M'],
    ])->assertOk();

    Http::assertSent(fn ($request) => ($request->data()['customer_details']['email'] ?? null) === 'budi@example.com');
});

test('the confirmation email links the id card by qr_token, not by id', function () {
    $category = paidFlowCategory();

    $registration = Registration::create([
        'registration_category_id' => $category->id,
        'event_id' => $category->event_id,
        'name' => 'Budi Santoso',
        'email' => 'budi@example.com',
        'status' => Registration::STATUS_CONFIRMED,
        'form_data' => [],
    ]);

    $rendered = (new RegistrationConfirmed($registration))->render();

    expect($rendered)->toContain($registration->qr_token)
        ->and($rendered)->not->toContain("/registrations/{$registration->id}/id-card");
});
