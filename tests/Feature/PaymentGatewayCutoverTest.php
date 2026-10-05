<?php

use App\Models\Payment;
use App\Models\Registration;
use App\Models\RegistrationCategory;
use App\Services\Midtrans\MidtransGateway;
use App\Services\Payments\PaymentCheckoutService;
use App\Services\Payments\PaymentGatewayManager;
use App\Services\Xendit\XenditGateway;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Http;

uses(RefreshDatabase::class);

test('provider selection is based on config', function () {
    $category = RegistrationCategory::factory()->create(['price' => 100000]);
    $registration = Registration::factory()->create([
        'registration_category_id' => $category->id,
        'status' => Registration::STATUS_PENDING_PAYMENT,
    ]);

    Http::fake([
        'app.sandbox.midtrans.com/snap/v1/transactions' => Http::response(['token' => 'tok'], 201),
        'api.xendit.co/sessions' => Http::response([
            'payment_session_id' => 'ses-123',
            'payment_link_url' => 'https://xendit.co/checkout/123',
        ], 200),
    ]);

    Config::set('payments.gateway', 'midtrans');
    $service = app(PaymentCheckoutService::class);
    $resultMidtrans = $service->getOrCreateCheckout($registration, 'http://test/success', 'http://test/fail');

    $paymentMidtrans = $registration->latestPayment();
    expect($paymentMidtrans->provider)->toBe(Payment::PROVIDER_MIDTRANS);

    Config::set('payments.gateway', 'xendit');
    app()->forgetInstance(PaymentGatewayManager::class);
    app()->forgetInstance(PaymentCheckoutService::class);
    $service2 = app(PaymentCheckoutService::class);

    $registration2 = Registration::factory()->create([
        'registration_category_id' => $category->id,
        'status' => Registration::STATUS_PENDING_PAYMENT,
    ]);
    $resultXendit = $service2->getOrCreateCheckout($registration2, 'http://test/success', 'http://test/fail');

    $paymentXendit = $registration2->latestPayment();
    expect($paymentXendit->provider)->toBe(Payment::PROVIDER_XENDIT);
});

test('both providers coexist and routing is by stored provider', function () {
    $manager = app(PaymentGatewayManager::class);

    $midtransPayment = Payment::factory()->create(['provider' => Payment::PROVIDER_MIDTRANS]);
    $xenditPayment = Payment::factory()->create(['provider' => Payment::PROVIDER_XENDIT]);

    $midtransGateway = $manager->gateway($midtransPayment->provider);
    $xenditGateway = $manager->gateway($xenditPayment->provider);

    expect($midtransGateway)->toBeInstanceOf(MidtransGateway::class)
        ->and($xenditGateway)->toBeInstanceOf(XenditGateway::class);
});

test('no cross-provider errors when dealing with mixed historical data', function () {
    // A legacy midtrans payment shouldn't trigger xendit exceptions and vice versa
    $manager = app(PaymentGatewayManager::class);

    $midtransPayment = Payment::factory()->create([
        'provider' => Payment::PROVIDER_MIDTRANS,
        'provider_session_id' => 'snap-123',
    ]);

    $xenditPayment = Payment::factory()->create([
        'provider' => Payment::PROVIDER_XENDIT,
        'provider_session_id' => 'ses-123',
    ]);

    expect(fn () => $manager->gateway($midtransPayment->provider))->not->toThrow(Exception::class)
        ->and(fn () => $manager->gateway($xenditPayment->provider))->not->toThrow(Exception::class);
});

test('historical access is preserved by checking default gateway resolving', function () {
    // When config points to xendit, a midtrans payment still gets MidtransGateway
    Config::set('payments.gateway', 'xendit');
    app()->forgetInstance(PaymentGatewayManager::class);

    $manager = app(PaymentGatewayManager::class);
    $midtransPayment = Payment::factory()->create(['provider' => Payment::PROVIDER_MIDTRANS]);

    $gateway = $manager->gateway($midtransPayment->provider);
    expect($gateway)->toBeInstanceOf(MidtransGateway::class);
});
