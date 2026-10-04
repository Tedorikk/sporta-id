<?php

use App\Models\Event;
use App\Models\RegistrationCategory;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('new registration categories default to online payment', function () {
    $category = RegistrationCategory::factory()->paid(150000)->create();

    expect($category->payment_method)->toBe(RegistrationCategory::PAYMENT_METHOD_ONLINE)
        ->and($category->fresh()->payment_method)->toBe(RegistrationCategory::PAYMENT_METHOD_ONLINE);
});

test('legacy midtrans and new online values are treated as online payments', function () {
    $online = RegistrationCategory::factory()->paid(150000)->create([
        'payment_method' => RegistrationCategory::PAYMENT_METHOD_ONLINE,
    ]);
    $legacy = RegistrationCategory::factory()->paid(150000)->create([
        'payment_method' => RegistrationCategory::PAYMENT_METHOD_MIDTRANS,
    ]);
    $manual = RegistrationCategory::factory()->paid(150000)->create([
        'payment_method' => RegistrationCategory::PAYMENT_METHOD_MANUAL_TRANSFER,
    ]);

    expect($online->usesOnlinePayment())->toBeTrue()
        ->and($legacy->usesOnlinePayment())->toBeTrue()
        ->and($manual->usesOnlinePayment())->toBeFalse()
        ->and($manual->usesManualPayment())->toBeTrue();
});

test('the normalizer dry run reports legacy rows without changing them', function () {
    RegistrationCategory::factory()->paid(150000)->create([
        'payment_method' => RegistrationCategory::PAYMENT_METHOD_MIDTRANS,
    ]);

    $this->artisan('payments:normalize-methods', ['--dry-run' => true])
        ->expectsOutput('1 category payment method(s) would be normalized from midtrans to online.')
        ->assertSuccessful();

    expect(RegistrationCategory::where('payment_method', RegistrationCategory::PAYMENT_METHOD_MIDTRANS)->count())->toBe(1);
});

test('the normalizer updates legacy rows idempotently in chunks', function () {
    RegistrationCategory::factory()->count(3)->paid(150000)->create([
        'payment_method' => RegistrationCategory::PAYMENT_METHOD_MIDTRANS,
    ]);
    RegistrationCategory::factory()->paid(150000)->create([
        'payment_method' => RegistrationCategory::PAYMENT_METHOD_MANUAL_TRANSFER,
    ]);

    $this->artisan('payments:normalize-methods', ['--chunk' => 2])
        ->expectsOutput('Normalized 3 category payment method(s) from midtrans to online.')
        ->assertSuccessful();

    expect(RegistrationCategory::where('payment_method', RegistrationCategory::PAYMENT_METHOD_MIDTRANS)->count())->toBe(0)
        ->and(RegistrationCategory::where('payment_method', RegistrationCategory::PAYMENT_METHOD_ONLINE)->count())->toBe(3)
        ->and(RegistrationCategory::where('payment_method', RegistrationCategory::PAYMENT_METHOD_MANUAL_TRANSFER)->count())->toBe(1);

    $this->artisan('payments:normalize-methods')
        ->expectsOutput('No legacy Midtrans category payment methods found.')
        ->assertSuccessful();
});

test('organizers can submit online or legacy midtrans category values during compatibility window', function (string $paymentMethod) {
    $event = Event::factory()->create();
    $user = organizerOf($event);

    $this->actingAs($user)
        ->post(route('registration_categories.store', $event), categoryPayload([
            'price' => '150000',
            'payment_method' => $paymentMethod,
            'form_pages' => [],
        ]))
        ->assertSessionHasNoErrors()
        ->assertRedirect(route('registration_categories.index', $event));

    expect(RegistrationCategory::sole()->payment_method)->toBe($paymentMethod);
})->with([
    RegistrationCategory::PAYMENT_METHOD_ONLINE,
    RegistrationCategory::PAYMENT_METHOD_MIDTRANS,
]);
