<?php

namespace Database\Factories;

use App\Models\BasketballEvent;
use App\Models\BasketballEventCategory;
use App\Models\Event;
use App\Models\RegistrationCategory;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<BasketballEventCategory>
 */
class BasketballEventCategoryFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * Bare use spins up an unrelated event for the registration category, so
     * prefer forEvent() in tests: it puts the tournament config and the sales
     * category on the same event, which is the only shape the app produces.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'basketball_event_id' => BasketballEvent::factory(),
            'registration_category_id' => RegistrationCategory::factory()->team(),
            'name' => fake()->unique()->randomElement(['U-12', 'U-14', 'U-16', 'U-18', 'Senior Putra', 'Senior Putri', 'Veteran'])
                .' '.fake()->unique()->numberBetween(1, 999),
            'format' => BasketballEventCategory::FORMAT_POOL_STAGE,
            'win_points' => 2,
            'loss_points' => 1,
            'min_team' => 2,
            'min_player_per_team' => 5,
            'max_player_per_team' => null,
            'max_player_per_coach' => null,
            'roster_closes_at' => null,
        ];
    }

    /**
     * Attach to an existing basketball event, creating its BasketballEvent
     * record if the event has none yet. The paired registration category is
     * created on the same event with the same name.
     */
    public function forEvent(Event $event): static
    {
        return $this->state(function (array $attributes) use ($event) {
            $event->loadMissing('specific');

            if (! $event->specific instanceof BasketballEvent) {
                $event->specific()->associate(BasketballEvent::factory()->create());
                $event->save();
            }

            return [
                'basketball_event_id' => $event->specific->id,
                'registration_category_id' => RegistrationCategory::factory()
                    ->team()
                    ->for($event)
                    ->state([
                        'name' => $attributes['name'],
                        'form_pages' => BasketballEventCategory::defaultFormPages(),
                    ]),
            ];
        });
    }

    public function roundRobin(): static
    {
        return $this->state(['format' => BasketballEventCategory::FORMAT_ROUND_ROBIN]);
    }
}
