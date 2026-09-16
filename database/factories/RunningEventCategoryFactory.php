<?php

namespace Database\Factories;

use App\Models\Event;
use App\Models\RunningEvent;
use App\Models\RunningEventCategory;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<RunningEventCategory>
 */
class RunningEventCategoryFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $distance = fake()->randomElement([5000, 10000, 21097, 42195]);

        return [
            'running_event_id' => RunningEvent::factory(),
            'name' => match ($distance) {
                5000 => '5K',
                10000 => '10K',
                21097 => 'Half Marathon',
                default => 'Full Marathon',
            },
            'distance_meters' => $distance,
            'start_at' => fake()->dateTimeBetween('+1 week', '+2 weeks'),
            'cutoff_minutes' => 120,
            'bib_prefix' => null,
            'bib_start_number' => 1,
            'bib_start_male' => null,
            'bib_start_female' => null,
            'minimum_age' => null,
        ];
    }

    /** A distance on the given event's race (the event must already be a running event). */
    public function forEvent(Event $event): static
    {
        return $this->state(fn () => ['running_event_id' => $event->specific->id]);
    }
}
