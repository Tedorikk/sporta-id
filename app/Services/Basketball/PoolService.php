<?php

namespace App\Services\Basketball;

use App\Models\BasketballEventCategory;
use App\Models\Pool;
use App\Models\Team;

class PoolService
{
    public function __construct(protected RoundRobinService $roundRobin) {}

    public function createPool(BasketballEventCategory $category, string $name): Pool
    {
        return $category->pools()->create(['name' => $name]);
    }

    public function assignTeamToPool(Team $team, Pool $pool): void
    {
        if ($team->basketball_event_category_id !== $pool->basketball_event_category_id) {
            throw new \Exception('Tim dan pool berasal dari kategori yang berbeda.');
        }

        $alreadyInAnotherPool = $team->pools()
            ->where('basketball_event_category_id', $pool->basketball_event_category_id)
            ->where('pools.id', '!=', $pool->id)
            ->exists();

        if ($alreadyInAnotherPool) {
            throw new \Exception('Tim sudah berada di pool lain pada kategori ini.');
        }

        $pool->teams()->syncWithoutDetaching($team->id);
    }

    public function removeTeamFromPool(Team $team, Pool $pool): void
    {
        $pool->teams()->detach($team->id);
    }

    public function autoAssign(BasketballEventCategory $category, string $prefix, int $numberOfPools, int $teamsPerPool, string $numberingStyle): int
    {
        $availableTeams = $category->teams()->whereDoesntHave('pools')->get();
        $created = 0;

        for ($i = 1; $i <= $numberOfPools; $i++) {
            $pool = $this->createPool($category, "{$prefix} ".$this->label($numberingStyle, $i));
            $slice = $availableTeams->splice(0, $teamsPerPool);

            if ($slice->isNotEmpty()) {
                $pool->teams()->attach($slice->pluck('id'));
                $this->roundRobin->generateForPool($pool); // auto-generate fixtures per pool
                $created++;
            }
        }

        return $created;
    }

    private function label(string $style, int $n): string
    {
        return match ($style) {
            'alpha' => chr(64 + $n),
            'roman' => ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'][$n] ?? (string) $n,
            default => (string) $n,
        };
    }
}
