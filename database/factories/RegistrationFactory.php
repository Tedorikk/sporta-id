<?php

namespace Database\Factories;

use App\Models\Registration;
use App\Models\RegistrationCategory;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Registration>
 */
class RegistrationFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'registration_category_id' => RegistrationCategory::factory(),
            'event_id' => fn (array $attributes): int => RegistrationCategory::findOrFail(
                $attributes['registration_category_id']
            )->event_id,
            'team_id' => null,
            'name' => fake()->name(),
            'email' => fake()->safeEmail(),
            'phone' => fake()->numerify('08##########'),
            'photo' => null,
            'form_data' => [],
            'status' => Registration::STATUS_PENDING_PAYMENT,
            'expires_at' => now()->addDay(),
            'locale' => 'en',
        ];
    }

    public function forCategory(RegistrationCategory $registrationCategory): static
    {
        return $this->state([
            'registration_category_id' => $registrationCategory->id,
            'event_id' => $registrationCategory->event_id,
        ]);
    }
}
