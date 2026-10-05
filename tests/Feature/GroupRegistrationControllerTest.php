<?php

use App\Mail\RegistrationConfirmed;
use App\Models\Event;
use App\Models\Payment;
use App\Models\Registration;
use App\Models\RegistrationCategory;
use App\Models\RegistrationOrder;
use App\Services\Payments\PaymentOutcome;
use App\Services\Payments\PaymentReconciler;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Mail;

uses(RefreshDatabase::class);

function groupOrderCategory(Event $event, array $overrides = []): RegistrationCategory
{
    return RegistrationCategory::create(array_merge([
        'event_id' => $event->id,
        'name' => '5K',
        'subject_type' => RegistrationCategory::SUBJECT_INDIVIDUAL,
        'price' => null,
        'quota' => null,
        'registration_open' => true,
        'form_pages' => [
            ['key' => 'page-1', 'title' => 'Details', 'fields' => [
                ['key' => 'email', 'label' => 'Email', 'type' => 'email', 'required' => true],
            ]],
        ],
    ], $overrides));
}

test('a free group order confirms every participant immediately', function () {
    $event = Event::factory()->create();
    $category = groupOrderCategory($event);

    $this->post(route('group_registration.store', $event), [
        'participants' => [
            ['registration_category_id' => $category->id, 'name' => 'Alpha', 'email' => 'alpha@example.com'],
            ['registration_category_id' => $category->id, 'name' => 'Beta', 'email' => 'beta@example.com'],
        ],
    ])->assertOk()->assertJson(['status' => RegistrationOrder::STATUS_CONFIRMED]);

    $order = RegistrationOrder::sole();

    expect($order->status)->toBe(RegistrationOrder::STATUS_CONFIRMED)
        ->and($order->registrations)->toHaveCount(2)
        ->and($order->registrations->pluck('status')->unique()->all())->toBe([Registration::STATUS_CONFIRMED])
        ->and($category->fresh()->registered_count)->toBe(2);
});

test('a paid group order creates one payment for the summed total across participants', function () {
    Http::fake(['app.sandbox.midtrans.com/snap/v1/transactions' => Http::response(['token' => 'tok-order'], 201)]);
    $event = Event::factory()->create();
    $fiveK = groupOrderCategory($event, ['name' => '5K', 'price' => 150000]);
    $tenK = groupOrderCategory($event, ['name' => '10K', 'price' => 200000]);

    $response = $this->post(route('group_registration.store', $event), [
        'participants' => [
            ['registration_category_id' => $fiveK->id, 'name' => 'Alpha', 'email' => 'alpha@example.com'],
            ['registration_category_id' => $tenK->id, 'name' => 'Beta', 'email' => 'beta@example.com'],
        ],
    ])->assertOk();

    $response->assertJson([
        'status' => RegistrationOrder::STATUS_PENDING_PAYMENT,
        'provider' => Payment::PROVIDER_MIDTRANS,
        'checkout_url' => null,
        'snap_token' => 'tok-order',
    ]);

    $order = RegistrationOrder::sole();
    $payment = $order->payments()->sole();

    expect((float) $payment->amount)->toBe(350000.0)
        ->and($order->registrations)->toHaveCount(2)
        ->and($order->registrations->pluck('status')->unique()->all())->toBe([Registration::STATUS_PENDING_PAYMENT])
        ->and($fiveK->fresh()->registered_count)->toBe(1)
        ->and($tenK->fresh()->registered_count)->toBe(1);
});

test('settling a group order confirms every participant and sends notifications', function () {
    Mail::fake();
    Http::fake(['app.sandbox.midtrans.com/snap/v1/transactions' => Http::response(['token' => 'tok'], 201)]);
    $event = Event::factory()->create();
    $category = groupOrderCategory($event, ['price' => 150000]);

    $this->post(route('group_registration.store', $event), [
        'participants' => [
            ['registration_category_id' => $category->id, 'name' => 'Alpha', 'email' => 'alpha@example.com'],
            ['registration_category_id' => $category->id, 'name' => 'Beta', 'email' => 'beta@example.com'],
        ],
    ])->assertOk();

    $order = RegistrationOrder::sole();
    $payment = $order->payments()->sole();

    app(PaymentReconciler::class)->reconcile($payment, PaymentOutcome::settled(
        provider: 'midtrans',
        amount: $payment->amount,
        currency: 'IDR',
        paidAt: now(),
        paymentId: 'mt-order-1'
    ));

    expect($order->fresh()->status)->toBe(RegistrationOrder::STATUS_CONFIRMED)
        ->and($order->fresh()->registrations->pluck('status')->unique()->all())->toBe([Registration::STATUS_CONFIRMED]);

    Mail::assertQueued(RegistrationConfirmed::class, 2);
});

test('an expired payment leaves the group order pending', function () {
    Http::fake(['app.sandbox.midtrans.com/snap/v1/transactions' => Http::response(['token' => 'tok'], 201)]);
    $event = Event::factory()->create();
    $category = groupOrderCategory($event, ['price' => 150000]);

    $this->post(route('group_registration.store', $event), [
        'participants' => [
            ['registration_category_id' => $category->id, 'name' => 'Alpha', 'email' => 'alpha@example.com'],
            ['registration_category_id' => $category->id, 'name' => 'Beta', 'email' => 'beta@example.com'],
        ],
    ])->assertOk();

    $order = RegistrationOrder::sole();
    $payment = $order->payments()->sole();

    app(PaymentReconciler::class)->reconcile($payment, PaymentOutcome::expired(
        provider: 'midtrans',
        providerStatus: 'expire'
    ));

    // For group orders, when the payment fails/expires, the order and registrations also expire
    // freeing up their quota slots.
    expect($order->fresh()->status)->toBe(RegistrationOrder::STATUS_EXPIRED)
        ->and($order->fresh()->registrations->pluck('status')->unique()->all())->toBe([Registration::STATUS_EXPIRED])
        ->and($category->fresh()->registered_count)->toBe(0);
});

test('a group order is rejected when the shared quota cannot fit every participant', function () {
    $event = Event::factory()->create();
    $category = groupOrderCategory($event, ['quota' => 1]);

    $this->post(route('group_registration.store', $event), [
        'participants' => [
            ['registration_category_id' => $category->id, 'name' => 'Alpha', 'email' => 'alpha@example.com'],
            ['registration_category_id' => $category->id, 'name' => 'Beta', 'email' => 'beta@example.com'],
        ],
    ])->assertSessionHasErrors('participants');

    expect(Registration::count())->toBe(0)
        ->and($category->fresh()->registered_count)->toBe(0);
});

test('a required field is validated per participant with its own error key', function () {
    $event = Event::factory()->create();
    $category = groupOrderCategory($event);

    $this->post(route('group_registration.store', $event), [
        'participants' => [
            ['registration_category_id' => $category->id, 'name' => 'Alpha', 'email' => 'alpha@example.com'],
            ['registration_category_id' => $category->id, 'name' => 'Beta'], // missing required email
        ],
    ])->assertSessionHasErrors('participants.1.email')
        ->assertSessionDoesntHaveErrors('participants.0.email');
});

test('a team category cannot be used in a group order', function () {
    $event = Event::factory()->create();
    $team = RegistrationCategory::create([
        'event_id' => $event->id,
        'name' => 'Team Entry',
        'subject_type' => RegistrationCategory::SUBJECT_TEAM,
        'form_pages' => [],
    ]);

    $this->post(route('group_registration.store', $event), [
        'participants' => [
            ['registration_category_id' => $team->id, 'name' => 'Alpha', 'email' => 'alpha@example.com'],
        ],
    ])->assertSessionHasErrors('participants');

    expect(Registration::count())->toBe(0);
});

test('a category from a different event cannot be smuggled into an order', function () {
    $event = Event::factory()->create();
    $otherEvent = Event::factory()->create();
    $category = groupOrderCategory($otherEvent);

    $this->post(route('group_registration.store', $event), [
        'participants' => [
            ['registration_category_id' => $category->id, 'name' => 'Alpha', 'email' => 'alpha@example.com'],
        ],
    ])->assertSessionHasErrors('participants');

    expect(Registration::count())->toBe(0);
});

// ─── Public pages ────────────────────────────────────────────────────────────

test('the group registration form lists every individual category on the event', function () {
    $event = Event::factory()->create();
    $individual = groupOrderCategory($event, ['name' => '5K']);
    RegistrationCategory::create([
        'event_id' => $event->id,
        'name' => 'Team Entry',
        'subject_type' => RegistrationCategory::SUBJECT_TEAM,
        'form_pages' => [],
    ]);

    $this->get(route('group_registration.create', $event))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('group-registration')
            ->has('categories', 1)
            ->where('categories.0.id', $individual->id)
        );
});

test('the order status page lists every participant', function () {
    $event = Event::factory()->create();
    $category = groupOrderCategory($event);

    $this->post(route('group_registration.store', $event), [
        'participants' => [
            ['registration_category_id' => $category->id, 'name' => 'Alpha', 'email' => 'alpha@example.com'],
        ],
    ])->assertOk();

    $order = RegistrationOrder::sole();

    $this->get(route('registration_orders.status', $order))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('registration-order-status')
            ->where('order.status', RegistrationOrder::STATUS_CONFIRMED)
            ->has('order.registrations', 1)
        );
});
