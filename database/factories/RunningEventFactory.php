<?php

namespace Database\Factories;

use App\Models\RunningEvent;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<RunningEvent>
 */
class RunningEventFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'registration_open' => true,
            'results_published' => false,
        ];
    }

    public function resultsPublished(): static
    {
        return $this->state(fn () => ['results_published' => true]);
    }
}
