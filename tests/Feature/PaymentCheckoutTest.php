<?php

namespace Tests\Feature;

use App\Models\Payment;
use App\Models\Registration;
use App\Services\Payments\PaymentCheckoutService;
use Illuminate\Foundation\Testing\RefreshDatabase;
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
        $this->assertArrayHasKey('created_at', $payment->request_snapshot);
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
