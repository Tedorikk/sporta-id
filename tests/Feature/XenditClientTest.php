<?php

namespace Tests\Feature;

use App\Services\Xendit\XenditClient;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class XenditClientTest extends TestCase
{
    use RefreshDatabase;

    public function test_creates_payment_session_successfully(): void
    {
        Http::fake([
            'api.xendit.co/sessions' => Http::response([
                'payment_session_id' => 'ps-test-123',
                'payment_link_url' => 'https://checkout.xendit.co/v2/ps-test-123',
                'status' => 'ACTIVE',
                'expires_at' => now()->addMinutes(30)->toISOString(),
                'business_id' => 'test-business-123',
                'reference_id' => 'ORD-001',
                'amount' => 150000,
                'currency' => 'IDR',
                'country' => 'ID',
            ], 200),
        ]);

        $client = new XenditClient();

        $result = $client->createSession([
            'reference_id' => 'ORD-001',
            'session_type' => 'PAY',
            'mode' => 'PAYMENT_LINK',
            'capture_method' => 'AUTOMATIC',
            'amount' => 150000,
            'currency' => 'IDR',
            'country' => 'ID',
        ]);

        $this->assertEquals('ps-test-123', $result['payment_session_id']);
        $this->assertEquals('ACTIVE', $result['status']);
    }

    public function test_retrieves_session_status(): void
    {
        Http::fake([
            'api.xendit.co/sessions/ps-test-123' => Http::response([
                'payment_session_id' => 'ps-test-123',
                'status' => 'COMPLETED',
                'amount' => 150000,
                'currency' => 'IDR',
                'payment_id' => 'pmt-123',
            ], 200),
        ]);

        $client = new XenditClient();

        $result = $client->retrieveSession('ps-test-123');

        $this->assertEquals('COMPLETED', $result['status']);
        $this->assertEquals('pmt-123', $result['payment_id']);
    }

    public function test_cancels_session(): void
    {
        Http::fake([
            'api.xendit.co/sessions/ps-test-123/cancel' => Http::response([
                'payment_session_id' => 'ps-test-123',
                'status' => 'CANCELED',
            ], 200),
        ]);

        $client = new XenditClient();

        $result = $client->cancelSession('ps-test-123');

        $this->assertEquals('CANCELED', $result['status']);
    }

    public function test_handles_api_errors(): void
    {
        Http::fake([
            'api.xendit.co/sessions' => Http::response([
                'error_code' => 'INVALID_REQUEST',
                'message' => 'Reference ID already exists',
            ], 400),
        ]);

        $client = new XenditClient();

        $this->expectException(\RuntimeException::class);
        $this->expectExceptionMessage('INVALID_REQUEST');

        $client->createSession([
            'reference_id' => 'DUPLICATE-001',
            'amount' => 150000,
        ]);
    }

    public function test_handles_network_timeout(): void
    {
        Http::fake(fn() => throw new \Illuminate\Http\Client\ConnectionException('Connection timeout'));

        $client = new XenditClient();

        $this->expectException(\RuntimeException::class);

        $client->createSession([
            'reference_id' => 'ORD-002',
            'amount' => 150000,
        ]);
    }

    public function test_uses_basic_auth(): void
    {
        Http::fake([
            'api.xendit.co/sessions' => Http::response(['payment_session_id' => 'ps-123'], 200),
        ]);

        config(['services.xendit.secret_key' => 'test-secret-key']);

        $client = new XenditClient();
        $client->createSession(['reference_id' => 'ORD-003', 'amount' => 100000]);

        Http::assertSent(function ($request) {
            return $request->hasHeader('Authorization', 'Basic ' . base64_encode('test-secret-key:'));
        });
    }
}
