<?php

namespace App\Services\Basketball;

use App\Models\BasketballEventCategory;
use App\Models\GameMatch;

class BracketService
{
    public function __construct(protected StandingsService $standings) {}

    /** Take top N per pool, seed a knockout bracket, cross pools so pool winners don't meet early. */
    public function generateFromPools(BasketballEventCategory $category, int $advancePerPool = 2): void
    {
        $seeded = $category->pools->flatMap(function ($pool) use ($advancePerPool) {
            return $this->standings->forPool($pool)->take($advancePerPool)->pluck('team_id');
        })->values()->all();

        $this->buildBracket($category, $seeded);
    }

    private function buildBracket(BasketballEventCategory $category, array $teamIds): void
    {
        $category->matches()->whereNotNull('round')->where('round', '!=', 'group')->delete();

        $size = 2 ** ceil(log(count($teamIds), 2));
        $roundName = match ($size) {
            16 => 'round_of_16', 8 => 'quarterfinal', 4 => 'semifinal', 2 => 'final', default => 'round_of_'.$size,
        };

        $currentRound = [];
        for ($i = 0; $i < $size / 2; $i++) {
            $currentRound[] = $category->matches()->create([
                'round' => $roundName,
                'match_number' => $i + 1,
                'home_team_id' => $teamIds[$i * 2] ?? null,
                'away_team_id' => $teamIds[$i * 2 + 1] ?? null,
            ]);
        }

        // create empty placeholder rounds, linked via source_match_id, until final
        while (count($currentRound) > 1) {
            $next = [];
            $nextRoundName = match (count($currentRound) / 2) {
                8 => 'round_of_16', 4 => 'quarterfinal', 2 => 'semifinal', 1 => 'final', default => 'round',
            };

            for ($i = 0; $i < count($currentRound) / 2; $i++) {
                $next[] = $category->matches()->create([
                    'round' => $nextRoundName,
                    'match_number' => $i + 1,
                    'home_source_match_id' => $currentRound[$i * 2]->id,
                    'away_source_match_id' => $currentRound[$i * 2 + 1]->id,
                ]);
            }
            $currentRound = $next;
        }
    }

    /** Call after recording a knockout match's score to push the winner forward. */
    public function advanceWinner(GameMatch $match): void
    {
        $winnerId = $match->winnerTeamId();
        if (! $winnerId) {
            return;
        }

        GameMatch::where('home_source_match_id', $match->id)->update(['home_team_id' => $winnerId]);
        GameMatch::where('away_source_match_id', $match->id)->update(['away_team_id' => $winnerId]);
    }
}
