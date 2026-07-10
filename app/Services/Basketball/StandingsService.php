<?php

namespace App\Services\Basketball;

use App\Models\BasketballEventCategory;
use App\Models\GameMatch;
use App\Models\Pool;
use Illuminate\Support\Collection;

class StandingsService
{
    public function forCategory(BasketballEventCategory $category): Collection
    {
        return $this->build(
            $category->matches()->whereNull('pool_id')->where('status', 'finished')->get(),
            $category
        );
    }

    public function forPool(Pool $pool): Collection
    {
        return $this->build(
            $pool->matches()->where('status', 'finished')->get(),
            $pool->category
        );
    }

    private function build(Collection $matches, BasketballEventCategory $category): Collection
    {
        $table = [];

        $touch = function (int $teamId) use (&$table) {
            $table[$teamId] ??= [
                'team_id' => $teamId,
                'played' => 0, 'won' => 0, 'lost' => 0,
                'points_for' => 0, 'points_against' => 0, 'points' => 0,
            ];
        };

        foreach ($matches as $match) {
            $touch($match->home_team_id);
            $touch($match->away_team_id);

            $home = &$table[$match->home_team_id];
            $away = &$table[$match->away_team_id];

            $home['played']++; $away['played']++;
            $home['points_for'] += $match->home_score;
            $home['points_against'] += $match->away_score;
            $away['points_for'] += $match->away_score;
            $away['points_against'] += $match->home_score;

            if ($match->home_score > $match->away_score) {
                $home['won']++; $home['points'] += $category->win_points;
                $away['lost']++; $away['points'] += $category->loss_points;
            } else {
                $away['won']++; $away['points'] += $category->win_points;
                $home['lost']++; $home['points'] += $category->loss_points;
            }
        }

        return collect($table)
            ->map(fn ($row) => $row + ['point_diff' => $row['points_for'] - $row['points_against']])
            ->sortByDesc(fn ($row) => [$row['points'], $row['point_diff'], $row['points_for']])
            ->values();
    }
}