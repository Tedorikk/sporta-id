<?php

namespace Database\Factories;

use App\Models\Event;
use App\Models\RegistrationCategory;
use App\Models\RunningEventCategory;
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

    /**
     * An individual category selling entries to the given distance, on the
     * distance's own event. Uses a bare form; `->withRaceForm()` opts into
     * the full default (which makes every test registration need a gender,
     * a date of birth and two photos).
     */
    public function forDistance(RunningEventCategory $distance): static
    {
        return $this->state(fn () => [
            'event_id' => $distance->runningEvent->event->id,
            'running_event_category_id' => $distance->id,
            'subject_type' => RegistrationCategory::SUBJECT_INDIVIDUAL,
        ]);
    }

    public function withRaceForm(): static
    {
        return $this->state(['form_pages' => RunningEventCategory::defaultFormPages()]);
    }
}
