<?php

namespace Database\Factories;

use App\Models\Award;
use App\Models\Event;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Award>
 */
class AwardFactory extends Factory
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
            'title' => fake()->randomElement(['Most Valuable Player', 'Best Team', 'Fan Favourite']),
            'description' => fake()->sentence(),
            'nominee_kind' => Award::NOMINEE_KIND_TEAM,
            'allowed_voters' => [Award::VOTER_PUBLIC],
            'status' => Award::STATUS_DRAFT,
            'results_visibility' => Award::RESULTS_AFTER_CLOSE,
            'is_paid' => false,
            'price_per_vote' => null,
            'max_votes_per_transaction' => null,
            'max_votes_per_voter' => null,
            'opens_at' => null,
            'closes_at' => null,
        ];
    }

    public function open(): static
    {
        return $this->state(['status' => Award::STATUS_OPEN]);
    }

    public function closed(): static
    {
        return $this->state(['status' => Award::STATUS_CLOSED]);
    }

    public function forPlayers(): static
    {
        return $this->state(['nominee_kind' => Award::NOMINEE_KIND_PLAYER]);
    }

    public function paid(int $pricePerVote = 5000): static
    {
        return $this->state([
            'is_paid' => true,
            'price_per_vote' => $pricePerVote,
        ]);
    }

    /**
     * @param  array<int, string>  $voters
     */
    public function votedBy(array $voters): static
    {
        return $this->state(['allowed_voters' => $voters]);
    }

    public function liveResults(): static
    {
        return $this->state(['results_visibility' => Award::RESULTS_LIVE]);
    }
}
