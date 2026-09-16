<?php

namespace Database\Factories;

use App\Models\RaceParticipant;
use App\Models\RunningEventCategory;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<RaceParticipant>
 */
class RaceParticipantFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'running_event_category_id' => RunningEventCategory::factory(),
            'registration_id' => null,
            'bib_number' => (string) fake()->unique()->numberBetween(1, 9999),
            'name' => fake()->name(),
            'email' => fake()->safeEmail(),
            'phone' => null,
            'status' => RaceParticipant::STATUS_REGISTERED,
        ];
    }

    public function finished(int $durationSeconds): static
    {
        return $this->state(fn () => [
            'status' => RaceParticipant::STATUS_FINISHED,
            'duration_seconds' => $durationSeconds,
        ]);
    }
}
