<?php

use App\Models\Payment;
use App\Models\PaymentEffect;
use App\Models\Registration;
use App\Models\RegistrationCategory;
use App\Services\Payments\PaymentOutcome;
use App\Services\Payments\PaymentReconciler;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Bus;

uses(RefreshDatabase::class);

function reconciliationPayment(array $registrationOverrides = [], array $paymentOverrides = []): Payment
{
    $category = RegistrationCategory::factory()->paid(150000)->create(['registered_count' => 1]);
    $registration = Registration::factory()->forCategory($category)->create(array_merge([
        'status' => Registration::STATUS_PENDING_PAYMENT,
        'expires_at' => now()->addDay(),
    ], $registrationOverrides));

    return $registration->payments()->create(array_merge([
        'order_id' => 'ORD-RECON-'.fake()->unique()->numerify('####'),
        'amount' => 150000,
        'currency' => 'IDR',
        'status' => Payment::STATUS_PENDING,
        'provider' => Payment::PROVIDER_XENDIT,
        'provider_session_id' => 'ps-'.fake()->unique()->numerify('####'),
        'checkout_state' => Payment::CHECKOUT_READY,
        'checkout_expires_at' => now()->addMinutes(30),
    ], $paymentOverrides));
}

test('it settles a completed outcome and creates one fulfillment effect', function () {
    Bus::fake();
    $payment = reconciliationPayment();

    app(PaymentReconciler::class)->reconcile($payment, PaymentOutcome::settled(
        provider: Payment::PROVIDER_XENDIT,
        amount: 150000,
        currency: 'IDR',
        paidAt: now(),
        sessionId: $payment->provider_session_id,
        paymentId: 'pay-1',
        providerStatus: 'COMPLETED',
    ));

    expect($payment->fresh()->status)->toBe(Payment::STATUS_SETTLEMENT)
        ->and($payment->fresh()->checkout_state)->toBe(Payment::CHECKOUT_CLOSED)
        ->and($payment->fresh()->fulfillment_state)->toBe(Payment::FULFILLMENT_FULFILLED)
        ->and($payment->payable->fresh()->status)->toBe(Registration::STATUS_CONFIRMED)
        ->and(PaymentEffect::count())->toBe(1);
});

test('it closes expired payments without confirming the registration', function () {
    Bus::fake();
    $payment = reconciliationPayment();

    app(PaymentReconciler::class)->reconcile($payment, PaymentOutcome::expired(
        provider: Payment::PROVIDER_XENDIT,
        sessionId: $payment->provider_session_id,
        providerStatus: 'EXPIRED',
    ));

    expect($payment->fresh()->status)->toBe(Payment::STATUS_EXPIRE)
        ->and($payment->fresh()->checkout_state)->toBe(Payment::CHECKOUT_CLOSED)
        ->and($payment->payable->fresh()->status)->toBe(Registration::STATUS_PENDING_PAYMENT)
        ->and(PaymentEffect::count())->toBe(0);
});

test('it prevents settled payments from regressing to expired', function () {
    Bus::fake();
    $payment = reconciliationPayment([], [
        'status' => Payment::STATUS_SETTLEMENT,
        'checkout_state' => Payment::CHECKOUT_CLOSED,
        'paid_at' => now(),
    ]);

    app(PaymentReconciler::class)->reconcile($payment, PaymentOutcome::expired(
        provider: Payment::PROVIDER_XENDIT,
        sessionId: $payment->provider_session_id,
        providerStatus: 'EXPIRED',
    ));

    expect($payment->fresh()->status)->toBe(Payment::STATUS_SETTLEMENT);
});

test('it does not create duplicate effects when the same settlement is replayed', function () {
    Bus::fake();
    $payment = reconciliationPayment();
    $outcome = PaymentOutcome::settled(
        provider: Payment::PROVIDER_XENDIT,
        amount: 150000,
        currency: 'IDR',
        paidAt: now(),
        sessionId: $payment->provider_session_id,
        paymentId: 'pay-1',
        providerStatus: 'COMPLETED',
    );

    app(PaymentReconciler::class)->reconcile($payment, $outcome);
    app(PaymentReconciler::class)->reconcile($payment->fresh(), $outcome);

    expect(PaymentEffect::count())->toBe(1)
        ->and($payment->fresh()->status)->toBe(Payment::STATUS_SETTLEMENT);
});

test('it records late payments without fulfilling already expired registrations', function () {
    Bus::fake();
    $payment = reconciliationPayment([
        'status' => Registration::STATUS_EXPIRED,
        'expires_at' => now()->subHour(),
    ], [
        'status' => Payment::STATUS_EXPIRE,
        'checkout_state' => Payment::CHECKOUT_CLOSED,
    ]);

    app(PaymentReconciler::class)->reconcile($payment, PaymentOutcome::settled(
        provider: Payment::PROVIDER_XENDIT,
        amount: 150000,
        currency: 'IDR',
        paidAt: now(),
        sessionId: $payment->provider_session_id,
        paymentId: 'late-pay',
        providerStatus: 'COMPLETED',
    ));

    expect($payment->fresh()->status)->toBe(Payment::STATUS_SETTLEMENT)
        ->and($payment->fresh()->fulfillment_state)->toBe(Payment::FULFILLMENT_LATE_PAYMENT)
        ->and($payment->payable->fresh()->status)->toBe(Registration::STATUS_EXPIRED)
        ->and(PaymentEffect::count())->toBe(0);
});

test('it records excess payments when another attempt already settled', function () {
    Bus::fake();
    $firstPayment = reconciliationPayment([], [
        'status' => Payment::STATUS_SETTLEMENT,
        'checkout_state' => Payment::CHECKOUT_CLOSED,
        'paid_at' => now(),
    ]);
    $registration = $firstPayment->payable;
    $secondPayment = $registration->payments()->create([
        'order_id' => 'ORD-RECON-EXCESS',
        'amount' => 150000,
        'currency' => 'IDR',
        'status' => Payment::STATUS_PENDING,
        'provider' => Payment::PROVIDER_XENDIT,
        'provider_session_id' => 'ps-excess',
        'checkout_state' => Payment::CHECKOUT_READY,
        'checkout_expires_at' => now()->addMinutes(30),
    ]);

    app(PaymentReconciler::class)->reconcile($secondPayment, PaymentOutcome::settled(
        provider: Payment::PROVIDER_XENDIT,
        amount: 150000,
        currency: 'IDR',
        paidAt: now(),
        sessionId: 'ps-excess',
        paymentId: 'pay-excess',
        providerStatus: 'COMPLETED',
    ));

    expect($secondPayment->fresh()->status)->toBe(Payment::STATUS_SETTLEMENT)
        ->and($secondPayment->fresh()->fulfillment_state)->toBe(Payment::FULFILLMENT_EXCESS_PAYMENT)
        ->and(PaymentEffect::count())->toBe(0);
});
