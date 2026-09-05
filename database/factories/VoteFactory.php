<?php

namespace Database\Factories;

use App\Models\Award;
use App\Models\AwardNominee;
use App\Models\Vote;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Database\Eloquent\Model;

/**
 * @extends Factory<Vote>
 */
class VoteFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'award_id' => Award::factory(),
            'award_nominee_id' => AwardNominee::factory(),
            'quantity' => 1,
            'status' => Vote::STATUS_COUNTED,
            'voter_type' => null,
            'voter_id' => null,
            'voter_name' => fake()->name(),
            'voter_email' => fake()->safeEmail(),
            'voter_phone' => null,
            'voter_fingerprint' => fake()->sha256(),
            'ip_address' => fake()->ipv4(),
            'amount' => null,
        ];
    }

    /**
     * A vote on a specific nominee, kept consistent with that nominee's award.
     */
    public function onNominee(AwardNominee $nominee): static
    {
        return $this->state([
            'award_id' => $nominee->award_id,
            'award_nominee_id' => $nominee->id,
        ]);
    }

    public function by(Model $voter): static
    {
        return $this->state([
            'voter_type' => $voter::class,
            'voter_id' => $voter->getKey(),
        ]);
    }

    public function pending(): static
    {
        return $this->state(['status' => Vote::STATUS_PENDING]);
    }

    public function void(): static
    {
        return $this->state(['status' => Vote::STATUS_VOID]);
    }

    public function paid(int $quantity, int $pricePerVote = 5000): static
    {
        return $this->state([
            'quantity' => $quantity,
            'amount' => $quantity * $pricePerVote,
        ]);
    }
}
