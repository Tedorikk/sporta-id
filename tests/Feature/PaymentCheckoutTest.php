<?php

namespace Tests\Feature;

use App\Models\Payment;
use App\Models\Registration;
use App\Services\Payments\PaymentCheckoutService;
use App\Services\Payments\PaymentGatewayManager;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class PaymentCheckoutTest extends TestCase
{
    use RefreshDatabase;

    public function test_creates_new_checkout_for_payable(): void
    {
        Http::fake([
            'api.xendit.co/sessions' => Http::response([
                'payment_session_id' => 'ps-test-123',
                'payment_link_url' => 'https://checkout.xendit.co/v2/ps-test-123',
                'status' => 'ACTIVE',
                'expires_at' => now()->addMinutes(30)->toISOString(),
                'business_id' => config('services.xendit.business_id'),
            ], 200),
        ]);

        config(['payments.gateway' => 'xendit']);

        $registration = Registration::factory()->create();
        $service = app(PaymentCheckoutService::class);

        $result = $service->getOrCreateCheckout(
            $registration,
            'https://example.com/success',
            'https://example.com/failure'
        );

        $this->assertTrue($result->success);
        $this->assertEquals('https://checkout.xendit.co/v2/ps-test-123', $result->checkoutUrl);
        $this->assertEquals('ps-test-123', $result->sessionId);

        // Verify payment record created
        $payment = Payment::where('payable_id', $registration->id)->first();
        $this->assertNotNull($payment);
        $this->assertEquals('xendit', $payment->provider);
        $this->assertEquals(Payment::CHECKOUT_READY, $payment->checkout_state);
        $this->assertEquals('ps-test-123', $payment->provider_session_id);
    }

    public function test_midtrans_checkout_remains_compatible_with_neutral_payables(): void
    {
        Http::fake([
            'app.sandbox.midtrans.com/snap/v1/transactions' => Http::response([
                'token' => 'snap-neutral-123',
            ], 201),
        ]);

        config(['payments.gateway' => 'midtrans']);

        $registration = Registration::factory()->create();

        $result = app(PaymentCheckoutService::class)->getOrCreateCheckout(
            $registration,
            'https://example.com/success',
            'https://example.com/failure'
        );

        $this->assertTrue($result->success);
        $this->assertEquals('snap-neutral-123', $result->sessionId);

        $payment = $registration->payments()->firstOrFail();

        $this->assertEquals(Payment::PROVIDER_MIDTRANS, $payment->provider);
        $this->assertEquals('snap-neutral-123', $payment->snap_token);
        $this->assertEquals(Payment::CHECKOUT_READY, $payment->checkout_state);
    }

    public function test_xendit_is_not_resolved_until_it_is_used(): void
    {
        config([
            'payments.gateway' => 'midtrans',
            'services.xendit.secret_key' => null,
        ]);

        $manager = app(PaymentGatewayManager::class);

        $this->assertTrue($manager->hasProvider(Payment::PROVIDER_XENDIT));
        $this->assertEquals(Payment::PROVIDER_MIDTRANS, $manager->defaultGateway()->getProvider());
    }

    public function test_reuses_active_checkout(): void
    {
        $registration = Registration::factory()->create();

        // Create existing active checkout
        $existingPayment = Payment::factory()->create([
            'payable_type' => Registration::class,
            'payable_id' => $registration->id,
            'provider' => 'xendit',
            'checkout_state' => Payment::CHECKOUT_READY,
            'checkout_url' => 'https://checkout.xendit.co/v2/ps-existing',
            'provider_session_id' => 'ps-existing',
            'checkout_expires_at' => now()->addMinutes(20),
            'status' => Payment::STATUS_PENDING,
        ]);

        $service = app(PaymentCheckoutService::class);

        $result = $service->getOrCreateCheckout(
            $registration,
            'https://example.com/success',
            'https://example.com/failure'
        );

        $this->assertTrue($result->success);
        $this->assertEquals('https://checkout.xendit.co/v2/ps-existing', $result->checkoutUrl);
        $this->assertEquals('ps-existing', $result->sessionId);

        // No new HTTP request should have been made
        Http::assertNothingSent();

        // Should not create another payment record
        $this->assertEquals(1, Payment::where('payable_id', $registration->id)->count());
    }

    public function test_creates_new_attempt_after_expiry(): void
    {
        Http::fake([
            'api.xendit.co/sessions' => Http::response([
                'payment_session_id' => 'ps-new-456',
                'payment_link_url' => 'https://checkout.xendit.co/v2/ps-new-456',
                'status' => 'ACTIVE',
                'expires_at' => now()->addMinutes(30)->toISOString(),
            ], 200),
        ]);

        config(['payments.gateway' => 'xendit']);

        $registration = Registration::factory()->create();

        // Create expired checkout
        Payment::factory()->create([
            'payable_type' => Registration::class,
            'payable_id' => $registration->id,
            'provider' => 'xendit',
            'checkout_state' => Payment::CHECKOUT_READY,
            'checkout_url' => 'https://checkout.xendit.co/v2/ps-expired',
            'provider_session_id' => 'ps-expired',
            'checkout_expires_at' => now()->subMinutes(5),
            'status' => Payment::STATUS_PENDING,
        ]);

        $service = app(PaymentCheckoutService::class);

        $result = $service->getOrCreateCheckout(
            $registration,
            'https://example.com/success',
            'https://example.com/failure'
        );

        $this->assertTrue($result->success);
        $this->assertEquals('ps-new-456', $result->sessionId);

        // Should have created a new payment attempt
        $this->assertEquals(2, Payment::where('payable_id', $registration->id)->count());
    }

    public function test_returns_preparing_when_lease_active(): void
    {
        $registration = Registration::factory()->create();

        // Create payment with active creation lease
        Payment::factory()->create([
            'payable_type' => Registration::class,
            'payable_id' => $registration->id,
            'provider' => 'xendit',
            'checkout_state' => Payment::CHECKOUT_CREATING,
            'creation_lease_expires_at' => now()->addMinutes(3),
            'status' => Payment::STATUS_PENDING,
        ]);

        $service = app(PaymentCheckoutService::class);

        $result = $service->getOrCreateCheckout(
            $registration,
            'https://example.com/success',
            'https://example.com/failure'
        );

        $this->assertFalse($result->success);
        $this->assertEquals('preparing', $result->errorCode);
    }

    public function test_handles_checkout_unavailable(): void
    {
        config(['payments.checkout_enabled' => false]);

        $registration = Registration::factory()->create();
        $service = app(PaymentCheckoutService::class);

        $result = $service->getOrCreateCheckout(
            $registration,
            'https://example.com/success',
            'https://example.com/failure'
        );

        $this->assertFalse($result->success);
        $this->assertEquals('unavailable', $result->errorCode);
        $this->assertFalse($result->canRetry);
    }

    public function test_stores_immutable_snapshot(): void
    {
        Http::fake([
            'api.xendit.co/sessions' => Http::response([
                'payment_session_id' => 'ps-snapshot',
                'payment_link_url' => 'https://checkout.xendit.co/v2/ps-snapshot',
                'status' => 'ACTIVE',
                'expires_at' => now()->addMinutes(30)->toISOString(),
            ], 200),
        ]);

        config(['payments.gateway' => 'xendit']);

        $registration = Registration::factory()->create();
        $service = app(PaymentCheckoutService::class);

        $service->getOrCreateCheckout(
            $registration,
            'https://example.com/success',
            'https://example.com/failure'
        );

        $payment = Payment::where('payable_id', $registration->id)->first();

        $this->assertNotNull($payment->request_snapshot);
        $this->assertIsArray($payment->request_snapshot);
        $this->assertArrayHasKey('amount', $payment->request_snapshot);
        $this->assertArrayHasKey('currency', $payment->request_snapshot);
        $this->assertArrayHasKey('items', $payment->request_snapshot);
        $this->assertArrayHasKey('customer', $payment->request_snapshot);
        $this->assertArrayHasKey('created_at', $payment->request_snapshot);
    }

    public function test_replacement_attempt_reuses_the_original_purchase_snapshot(): void
    {
        Http::fake([
            'api.xendit.co/sessions' => Http::response([
                'payment_session_id' => 'ps-frozen',
                'payment_link_url' => 'https://checkout.xendit.co/v2/ps-frozen',
                'status' => 'ACTIVE',
                'expires_at' => now()->addMinutes(30)->toISOString(),
            ], 200),
        ]);

        config(['payments.gateway' => 'xendit']);

        $registration = Registration::factory()->create();
        $registration->registrationCategory->update(['price' => 150000]);

        $original = $registration->payments()->create([
            'provider' => Payment::PROVIDER_XENDIT,
            'order_id' => 'ORIGINAL-FROZEN',
            'amount' => 100000,
            'status' => Payment::STATUS_PENDING,
            'checkout_state' => Payment::CHECKOUT_FAILED,
            'request_snapshot' => [
                'amount' => 100000,
                'currency' => 'IDR',
                'description' => 'Original registration',
                'items' => [[
                    'reference_id' => 'registration',
                    'name' => 'Original registration',
                    'quantity' => 1,
                    'unit_amount' => 100000,
                ]],
                'customer' => [
                    'email' => 'original@example.com',
                    'given_names' => 'Original Customer',
                ],
                'created_at' => now()->subHour()->toISOString(),
            ],
        ]);

        $result = app(PaymentCheckoutService::class)->getOrCreateCheckout(
            $registration,
            'https://example.com/success',
            'https://example.com/failure'
        );

        $this->assertTrue($result->success);

        $replacement = $registration->payments()->whereKeyNot($original->id)->firstOrFail();

        $this->assertEquals(100000, (int) $replacement->amount);
        $this->assertEquals($original->request_snapshot, $replacement->request_snapshot);

        Http::assertSent(fn ($request) => $request['amount'] === 100000
            && $request['items'][0]['net_unit_amount'] === 100000
            && $request['customer']['email'] === 'original@example.com');
    }

    public function test_network_timeout_marks_checkout_outcome_unknown(): void
    {
        Http::fake(fn () => throw new ConnectionException('Connection timeout'));

        config(['payments.gateway' => 'xendit']);

        $registration = Registration::factory()->create();

        $result = app(PaymentCheckoutService::class)->getOrCreateCheckout(
            $registration,
            'https://example.com/success',
            'https://example.com/failure'
        );

        $this->assertFalse($result->success);
        $this->assertEquals('unknown_outcome', $result->errorCode);
        $this->assertEquals(
            Payment::CHECKOUT_UNKNOWN,
            $registration->payments()->firstOrFail()->checkout_state,
        );
    }

    public function test_generates_unique_order_ids(): void
    {
        Http::fake([
            'api.xendit.co/sessions' => Http::response([
                'payment_session_id' => 'ps-123',
                'payment_link_url' => 'https://checkout.xendit.co/v2/ps-123',
                'status' => 'ACTIVE',
                'expires_at' => now()->addMinutes(30)->toISOString(),
            ], 200),
        ]);

        config(['payments.gateway' => 'xendit']);

        $registration1 = Registration::factory()->create();
        $registration2 = Registration::factory()->create();
        $service = app(PaymentCheckoutService::class);

        $service->getOrCreateCheckout($registration1, 'https://example.com/success', 'https://example.com/failure');
        $service->getOrCreateCheckout($registration2, 'https://example.com/success', 'https://example.com/failure');

        $payment1 = Payment::where('payable_id', $registration1->id)->first();
        $payment2 = Payment::where('payable_id', $registration2->id)->first();

        $this->assertNotEquals($payment1->order_id, $payment2->order_id);
        $this->assertStringStartsWith('ORD-', $payment1->order_id);
        $this->assertStringStartsWith('ORD-', $payment2->order_id);
    }
}
