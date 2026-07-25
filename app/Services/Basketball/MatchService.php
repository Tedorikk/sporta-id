<?php

namespace App\Services\Basketball;

use App\Models\BasketballEventCategory;
use App\Models\GameMatch;
use Illuminate\Validation\ValidationException;

class MatchService
{
    /**
     * Create a single match within a category, enforcing team/pool membership
     * and duplicate-fixture rules. Throws ValidationException on any
     * business-rule violation so the controller stays a thin pass-through.
     */
    public function create(BasketballEventCategory $category, array $data): GameMatch
    {
        $homeTeamId = (int) $data['home_team_id'];
        $awayTeamId = (int) $data['away_team_id'];
        $poolId = $data['pool_id'] ?? null;
        $round = $data['round'];

        $this->assertTeamsInCategory($category, $homeTeamId, $awayTeamId);

        if ($poolId) {
            $this->assertTeamsInPool($category, (int) $poolId, $homeTeamId, $awayTeamId);
        }

        $this->assertNoDuplicateFixture($category, $round, $poolId, $homeTeamId, $awayTeamId);

        return GameMatch::create([
            'basketball_event_category_id' => $category->id,
            'pool_id' => $poolId,
            'home_team_id' => $homeTeamId,
            'away_team_id' => $awayTeamId,
            'round' => $round,
            'match_number' => $data['match_number'] ?? $this->nextMatchNumber($category),
            'scheduled_at' => $data['scheduled_at'] ?? null,
            'status' => 'scheduled',
        ]);
    }

    /**
     * Update an existing match's fixture details, enforcing the same
     * business rules as create() (minus the match colliding with itself).
     */
    public function update(GameMatch $match, array $data): GameMatch
    {
        $category = $match->category;
        $homeTeamId = (int) $data['home_team_id'];
        $awayTeamId = (int) $data['away_team_id'];
        $poolId = $data['pool_id'] ?? null;
        $round = $data['round'];

        $this->assertTeamsInCategory($category, $homeTeamId, $awayTeamId);

        if ($poolId) {
            $this->assertTeamsInPool($category, (int) $poolId, $homeTeamId, $awayTeamId);
        }

        $this->assertNoDuplicateFixture($category, $round, $poolId, $homeTeamId, $awayTeamId, $match->id);

        $match->update([
            'pool_id' => $poolId,
            'home_team_id' => $homeTeamId,
            'away_team_id' => $awayTeamId,
            'round' => $round,
            'match_number' => $data['match_number'] ?? $match->match_number,
            'scheduled_at' => $data['scheduled_at'] ?? null,
        ]);

        return $match;
    }

    protected function assertTeamsInCategory(BasketballEventCategory $category, int $homeTeamId, int $awayTeamId): void
    {
        $teamIds = $category->teams()->pluck('teams.id');

        if (! $teamIds->contains($homeTeamId) || ! $teamIds->contains($awayTeamId)) {
            throw ValidationException::withMessages([
                'home_team_id' => 'Selected teams are not in this category.',
            ]);
        }
    }

    protected function assertTeamsInPool(BasketballEventCategory $category, int $poolId, int $homeTeamId, int $awayTeamId): void
    {
        $pool = $category->pools()->findOrFail($poolId);
        $poolTeamIds = $pool->teams()->pluck('teams.id');

        if (! $poolTeamIds->contains($homeTeamId) || ! $poolTeamIds->contains($awayTeamId)) {
            throw ValidationException::withMessages([
                'home_team_id' => 'Both teams must belong to the selected pool.',
            ]);
        }
    }

    protected function assertNoDuplicateFixture(BasketballEventCategory $category, string $round, ?int $poolId, int $homeTeamId, int $awayTeamId, ?int $excludeMatchId = null): void
    {
        $exists = GameMatch::query()
            ->where('basketball_event_category_id', $category->id)
            ->where('round', $round)
            ->where('pool_id', $poolId)
            ->when($excludeMatchId, fn ($query) => $query->where('id', '!=', $excludeMatchId))
            ->where(function ($query) use ($homeTeamId, $awayTeamId) {
                $query
                    ->where(fn ($q) => $q->where('home_team_id', $homeTeamId)->where('away_team_id', $awayTeamId))
                    ->orWhere(fn ($q) => $q->where('home_team_id', $awayTeamId)->where('away_team_id', $homeTeamId));
            })
            ->exists();

        if ($exists) {
            throw ValidationException::withMessages([
                'match' => 'A match between these two teams already exists.',
            ]);
        }
    }

    protected function nextMatchNumber(BasketballEventCategory $category): int
    {
        return (int) GameMatch::where('basketball_event_category_id', $category->id)->max('match_number') + 1;
    }
}