<?php

namespace Database\Factories;

use App\Models\BasketballEvent;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<BasketballEvent>
 */
class BasketballEventFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'pool_drawing_date' => fake()->dateTimeBetween('now', '+1 month'),
        ];
    }
}
