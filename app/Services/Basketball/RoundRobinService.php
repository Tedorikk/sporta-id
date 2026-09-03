<?php

namespace App\Services\Basketball;

use App\Models\BasketballEventCategory;
use App\Models\GameMatch;
use App\Models\Pool;
use Illuminate\Support\Collection;

class RoundRobinService
{
    /** Generates fixtures for a whole category (format = round_robin). */
    public function generateForCategory(BasketballEventCategory $category, Collection $teams): void
    {
        $category->matches()->delete();

        $this->generatePairs($teams->pluck('id')->all())
            ->each(fn ($pair) => $category->matches()->create([
                'home_team_id' => $pair[0],
                'away_team_id' => $pair[1],
                'round' => 'group',
                'status' => 'scheduled',
            ]));
    }

    /** Generates fixtures inside a single pool (format = pool). */
    public function generateForPool(Pool $pool): void
    {
        $pool->matches()->delete();

        $teamIds = $pool->teams()->pluck('teams.id')->all();

        $this->generatePairs($teamIds)->each(fn ($pair) => GameMatch::create([
            'basketball_event_category_id' => $pool->basketball_event_category_id,
            'pool_id' => $pool->id,
            'home_team_id' => $pair[0],
            'away_team_id' => $pair[1],
            'round' => 'group',
            'status' => 'scheduled',
        ]));
    }

    /** Circle method: every team plays every other team exactly once. */
    private function generatePairs(array $teamIds): Collection
    {
        $pairs = collect();
        $ids = array_values($teamIds);

        if (count($ids) % 2 !== 0) {
            $ids[] = null; // bye
        }

        $n = count($ids);
        $rounds = $n - 1;

        for ($round = 0; $round < $rounds; $round++) {
            for ($i = 0; $i < $n / 2; $i++) {
                $home = $ids[$i];
                $away = $ids[$n - 1 - $i];
                if ($home !== null && $away !== null) {
                    $pairs->push([$home, $away]);
                }
            }
            // rotate, keep first fixed
            $fixed = array_shift($ids);
            array_push($ids, array_shift($ids));
            array_unshift($ids, $fixed);
        }

        return $pairs;
    }
}
