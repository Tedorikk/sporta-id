<?php

namespace Database\Factories;

use App\Models\Payment;
use App\Models\PaymentEffect;
use App\Models\Registration;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\PaymentEffect>
 */
class PaymentEffectFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $effectType = $this->faker->randomElement([
            'confirmation_email',
            'quota_update',
            'bib_assignment',
            'vote_count',
        ]);

        return [
            'payment_id' => Payment::factory(),
            'payable_type' => Registration::class,
            'payable_id' => $this->faker->numberBetween(1, 1000),
            'effect_type' => $effectType,
            'effect_key' => $this->faker->unique()->uuid() . '|' . $effectType,
            'payload' => [
                'type' => $effectType,
                'data' => [
                    'email' => $this->faker->email(),
                    'name' => $this->faker->name(),
                ],
            ],
            'state' => 'pending',
            'attempts' => 0,
            'error_message' => null,
            'completed_at' => null,
        ];
    }

    /**
     * Indicate that the effect has been completed.
     */
    public function completed(): static
    {
        return $this->state(fn (array $attributes) => [
            'state' => 'completed',
            'completed_at' => now(),
        ]);
    }

    /**
     * Indicate that the effect processing failed.
     */
    public function failed(): static
    {
        return $this->state(fn (array $attributes) => [
            'state' => 'failed',
            'attempts' => $this->faker->numberBetween(1, 5),
            'error_message' => $this->faker->sentence(),
        ]);
    }

    /**
     * Set effect type to confirmation email.
     */
    public function confirmationEmail(): static
    {
        return $this->state(fn (array $attributes) => [
            'effect_type' => 'confirmation_email',
            'effect_key' => $attributes['payment_id'] . '|confirmation_email|' . $attributes['payable_id'],
        ]);
    }

    /**
     * Set effect type to quota update.
     */
    public function quotaUpdate(): static
    {
        return $this->state(fn (array $attributes) => [
            'effect_type' => 'quota_update',
            'effect_key' => $attributes['payment_id'] . '|quota_update|' . $attributes['payable_id'],
        ]);
    }
}
