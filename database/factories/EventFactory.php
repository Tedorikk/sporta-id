<?php

namespace Database\Factories;

use App\Models\Event;
use App\Models\Organization;
use App\Models\RunningEvent;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Event>
 */
class EventFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $start = fake()->dateTimeBetween('now', '+1 month');
        $end = fake()->dateTimeBetween($start, '+2 months');

        return [
            'organization_id' => Organization::factory(),
            'name' => fake()->company().' Tournament',
            'description' => fake()->sentence(),
            'contact_person' => fake()->name(),
            'category' => Event::CATEGORY_BASKETBALL,
            'is_published' => true,
            'start_date' => $start->format('Y-m-d'),
            'end_date' => $end->format('Y-m-d'),
            'banner' => null,
        ];
    }

    /**
     * A road race, with its RunningEvent module already attached — the state
     * every running test starts from.
     */
    public function running(): static
    {
        return $this->state(fn () => [
            'category' => Event::CATEGORY_RUNNING,
            'eventable_type' => RunningEvent::class,
            'eventable_id' => RunningEvent::factory(),
        ]);
    }
}
