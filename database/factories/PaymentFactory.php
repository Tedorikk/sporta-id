<?php

namespace Database\Factories;

use App\Models\Payment;
use App\Models\Registration;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<Payment>
 */
class PaymentFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'payable_type' => Registration::class,
            'payable_id' => Registration::factory(),
            'provider' => Payment::PROVIDER_MIDTRANS,
            'order_id' => 'TEST-'.Str::upper(Str::random(16)),
            'amount' => fake()->numberBetween(10000, 1000000),
            'currency' => 'IDR',
            'status' => Payment::STATUS_PENDING,
        ];
    }
}
