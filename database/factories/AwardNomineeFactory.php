<?php

namespace Database\Factories;

use App\Models\Award;
use App\Models\AwardNominee;
use App\Models\Team;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Database\Eloquent\Model;

/**
 * @extends Factory<AwardNominee>
 */
class AwardNomineeFactory extends Factory
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
            'nominee_type' => Team::class,
            'nominee_id' => Team::factory(),
            'display_name' => null,
            'photo' => null,
            'sort_order' => 0,
        ];
    }

    /**
     * Points the nominee at an existing player or team rather than making a
     * fresh one, which is what a test almost always wants.
     */
    public function of(Model $nominee): static
    {
        return $this->state([
            'nominee_type' => $nominee::class,
            'nominee_id' => $nominee->getKey(),
        ]);
    }
}
