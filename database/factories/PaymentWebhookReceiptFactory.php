<?php

namespace Database\Factories;

use App\Models\Payment;
use App\Models\PaymentWebhookReceipt;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\PaymentWebhookReceipt>
 */
class PaymentWebhookReceiptFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $provider = $this->faker->randomElement(['xendit', 'midtrans']);
        $sessionId = $provider === 'xendit' ? 'ps-' . $this->faker->uuid() : null;
        $referenceId = 'order-' . $this->faker->unique()->numberBetween(1000, 9999);
        
        return [
            'provider' => $provider,
            'provider_account_id' => $provider === 'xendit' ? $this->faker->numerify('########') : null,
            'provider_mode' => $this->faker->randomElement(['test', 'live']),
            'event_type' => $provider === 'xendit' 
                ? $this->faker->randomElement(['payment_session.completed', 'payment_session.expired'])
                : 'transaction.notification',
            'session_id' => $sessionId,
            'reference_id' => $referenceId,
            'payment_id' => null, // Will be linked after payment creation
            'dedupe_key' => "{$provider}|{$sessionId}|{$referenceId}|" . $this->faker->uuid(),
            'payload_digest' => hash('sha256', $this->faker->text()),
            'sanitized_payload' => [
                'event' => $provider === 'xendit' ? 'payment_session.completed' : 'transaction.notification',
                'data' => [
                    'reference_id' => $referenceId,
                    'amount' => $this->faker->numberBetween(50000, 500000),
                    'status' => 'COMPLETED',
                ],
            ],
            'processing_state' => 'received',
            'processing_attempts' => 0,
            'processing_error' => null,
            'received_at' => now(),
            'processed_at' => null,
        ];
    }

    /**
     * Indicate that the receipt has been processed.
     */
    public function processed(): static
    {
        return $this->state(fn (array $attributes) => [
            'processing_state' => 'processed',
            'processed_at' => now(),
        ]);
    }

    /**
     * Indicate that the receipt processing failed.
     */
    public function failed(): static
    {
        return $this->state(fn (array $attributes) => [
            'processing_state' => 'failed',
            'processing_attempts' => $this->faker->numberBetween(1, 5),
            'processing_error' => $this->faker->sentence(),
        ]);
    }

    /**
     * Indicate that the receipt is unmatched.
     */
    public function unmatched(): static
    {
        return $this->state(fn (array $attributes) => [
            'processing_state' => 'unmatched',
            'processing_error' => 'No payment found for session',
        ]);
    }
}
