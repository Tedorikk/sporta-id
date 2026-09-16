<?php

namespace App\Services\Running;

use App\Models\RaceParticipant;
use App\Models\RunningEventCategory;
use Illuminate\Support\Collection;

/**
 * The leaderboard for one distance. Places are computed on read rather than
 * stored, the same way basketball standings are: a corrected finish time
 * re-orders the field immediately, with no rank column to keep in step.
 */
class RaceRankingService
{
    /**
     * Finishers by net time, fastest first.
     *
     * @return Collection<int, array{rank: int, participant_id: int, bib_number: ?string, name: string, duration_seconds: int, pace_seconds_per_km: float, gap_seconds: int}>
     */
    public function forCategory(RunningEventCategory $category): Collection
    {
        $kilometers = $category->distanceKilometers();

        $finishers = $category->participants()
            ->finishers()
            ->orderBy('duration_seconds')
            // Two runners on the same second keep a stable order instead of
            // swapping places between two loads of the same page.
            ->orderBy('id')
            ->get();

        // finishers() guarantees a duration; the column stays nullable for
        // everyone else, so each read is narrowed here rather than trusted.
        $winningTime = $finishers->isEmpty() ? 0 : (int) $finishers->first()->duration_seconds;

        return $finishers->values()->map(function (RaceParticipant $participant, int $index) use ($kilometers, $winningTime) {
            $duration = (int) $participant->duration_seconds;

            return [
                'rank' => $index + 1,
                'participant_id' => $participant->id,
                'bib_number' => $participant->bib_number,
                'name' => $participant->name,
                'duration_seconds' => $duration,
                'pace_seconds_per_km' => $kilometers > 0
                    ? round($duration / $kilometers, 1)
                    : 0.0,
                'gap_seconds' => $duration - $winningTime,
            ];
        });
    }

    /**
     * Everyone who will not appear in the ranking, and why — the other half
     * of a published result sheet.
     *
     * @return Collection<int, RaceParticipant>
     */
    public function unrankedFor(RunningEventCategory $category): Collection
    {
        return $category->participants()
            ->whereIn('status', [
                RaceParticipant::STATUS_DNF,
                RaceParticipant::STATUS_DNS,
                RaceParticipant::STATUS_DISQUALIFIED,
            ])
            ->orderBy('bib_number')
            ->get();
    }
}
