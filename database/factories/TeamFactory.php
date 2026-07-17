<?php

namespace Database\Factories;

use App\Models\Event;
use App\Models\Team;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Team>
 */
class TeamFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'event_id' => Event::factory(),
            'name' => fake()->company().' FC',
            'manager_name' => fake()->name(),
            'manager_phone' => fake()->phoneNumber(),
            'logo' => null,
            'status' => fake()->randomElement(['pending', 'verified', 'rejected']),
            'basketball_event_category_id' => null,
        ];
    }

    public function verified(): static
    {
        return $this->state(['status' => 'verified']);
    }

    public function pending(): static
    {
        return $this->state(['status' => 'pending']);
    }
}
