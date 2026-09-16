<?php

namespace Database\Factories;

use App\Models\Event;
use App\Models\RegistrationCategory;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<RegistrationCategory>
 */
class RegistrationCategoryFactory extends Factory
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
            'name' => fake()->unique()->words(2, true),
            'subject_type' => RegistrationCategory::SUBJECT_INDIVIDUAL,
            'price' => null,
            'quota' => null,
            'registration_open' => true,
            'form_pages' => [
                ['key' => 'page-1', 'title' => 'Details', 'fields' => []],
            ],
        ];
    }

    public function team(): static
    {
        return $this->state(['subject_type' => RegistrationCategory::SUBJECT_TEAM]);
    }

    public function individual(): static
    {
        return $this->state(['subject_type' => RegistrationCategory::SUBJECT_INDIVIDUAL]);
    }

    public function paid(float $price = 150000): static
    {
        return $this->state(['price' => $price]);
    }

    public function closed(): static
    {
        return $this->state(['registration_open' => false]);
    }
}
