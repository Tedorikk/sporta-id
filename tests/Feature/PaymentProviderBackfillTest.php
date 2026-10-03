<?php

namespace Tests\Feature;

use App\Models\Payment;
use App\Models\Registration;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PaymentProviderBackfillTest extends TestCase
{
    use RefreshDatabase;

    public function test_backfills_midtrans_payments_with_snap_token(): void
    {
        $registration = Registration::factory()->create();
        
        $payment = Payment::factory()->create([
            'payable_type' => Registration::class,
            'payable_id' => $registration->id,
            'snap_token' => 'snap-token-123',
            'provider' => null,
        ]);

        $this->artisan('payments:backfill-providers')
            ->assertSuccessful();

        $payment->refresh();
        
        $this->assertEquals('midtrans', $payment->provider);
        $this->assertEquals('IDR', $payment->currency);
    }

    public function test_backfills_midtrans_payments_with_transaction_id(): void
    {
        $registration = Registration::factory()->create();
        
        $payment = Payment::factory()->create([
            'payable_type' => Registration::class,
            'payable_id' => $registration->id,
            'midtrans_transaction_id' => 'mt-123456',
            'snap_token' => null,
            'provider' => null,
        ]);

        $this->artisan('payments:backfill-providers')
            ->assertSuccessful();

        $payment->refresh();
        
        $this->assertEquals('midtrans', $payment->provider);
        $this->assertEquals('mt-123456', $payment->provider_payment_id);
        $this->assertEquals('IDR', $payment->currency);
    }

    public function test_backfills_manual_payments_with_verification(): void
    {
        $registration = Registration::factory()->create();
        $verifier = \App\Models\User::factory()->create();
        
        $payment = Payment::factory()->create([
            'payable_type' => Registration::class,
            'payable_id' => $registration->id,
            'snap_token' => null,
            'midtrans_transaction_id' => null,
            'proof_path' => 'proofs/payment-123.jpg',
            'verified_by' => $verifier->id,
            'provider' => null,
        ]);

        $this->artisan('payments:backfill-providers')
            ->assertSuccessful();

        $payment->refresh();
        
        $this->assertEquals('manual_transfer', $payment->provider);
        $this->assertEquals(Payment::CHECKOUT_CLOSED, $payment->checkout_state);
    }

    public function test_backfill_is_idempotent(): void
    {
        $registration = Registration::factory()->create();
        
        $payment = Payment::factory()->create([
            'payable_type' => Registration::class,
            'payable_id' => $registration->id,
            'snap_token' => 'snap-token-456',
            'provider' => null,
        ]);

        // Run twice
        $this->artisan('payments:backfill-providers')->assertSuccessful();
        $this->artisan('payments:backfill-providers')->assertSuccessful();

        $payment->refresh();
        
        // Should still be midtrans with correct data
        $this->assertEquals('midtrans', $payment->provider);
        $this->assertEquals('IDR', $payment->currency);
    }

    public function test_dry_run_does_not_modify_database(): void
    {
        $registration = Registration::factory()->create();
        
        $payment = Payment::factory()->create([
            'payable_type' => Registration::class,
            'payable_id' => $registration->id,
            'snap_token' => 'snap-token-789',
            'provider' => null,
        ]);

        $this->artisan('payments:backfill-providers --dry-run')
            ->assertSuccessful();

        $payment->refresh();
        
        // Should not have been modified
        $this->assertNull($payment->provider);
    }

    public function test_sets_checkout_state_for_settled_payments(): void
    {
        $registration = Registration::factory()->create();
        
        $payment = Payment::factory()->create([
            'payable_type' => Registration::class,
            'payable_id' => $registration->id,
            'snap_token' => 'snap-token-abc',
            'status' => Payment::STATUS_SETTLEMENT,
            'paid_at' => now(),
            'provider' => null,
        ]);

        $this->artisan('payments:backfill-providers')
            ->assertSuccessful();

        $payment->refresh();
        
        $this->assertEquals('midtrans', $payment->provider);
        $this->assertEquals(Payment::CHECKOUT_CLOSED, $payment->checkout_state);
        $this->assertEquals(Payment::FULFILLMENT_FULFILLED, $payment->fulfillment_state);
        $this->assertNotNull($payment->last_reconciled_at);
    }
}
