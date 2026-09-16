<?php

namespace App\Services\Running;

use App\Models\RaceParticipant;
use App\Models\Registration;
use App\Models\RunningEventCategory;
use Illuminate\Support\Facades\DB;

/**
 * Hands runners on a distance's start list their bib numbers.
 *
 * A confirmed registration gets its bib the moment it lands on the start
 * list (see {@see RaceEntryService}); the bulk pass here sweeps in anything
 * that slipped past that — walk-ins staff added without a number, entries
 * confirmed before bibs were switched on — and is safe to re-run.
 */
class BibNumberAssigner
{
    /**
     * @return array{created: int, assigned: int}
     */
    public function assign(RunningEventCategory $category): array
    {
        return DB::transaction(function () use ($category) {
            $created = $this->addMissingRegistrants($category);
            $assigned = $this->numberUnnumberedRunners($category);

            return ['created' => $created, 'assigned' => $assigned];
        });
    }

    /**
     * Every confirmed registration on any category selling this distance
     * that isn't on the start list yet joins it.
     */
    private function addMissingRegistrants(RunningEventCategory $category): int
    {
        $alreadyListed = $category->participants()
            ->whereNotNull('registration_id')
            ->pluck('registration_id');

        $newcomers = Registration::query()
            ->whereIn('registration_category_id', $category->registrationCategories()->select('id'))
            ->where('status', Registration::STATUS_CONFIRMED)
            ->whereNotIn('id', $alreadyListed)
            ->orderBy('id')
            ->get();

        $entries = app(RaceEntryService::class);

        foreach ($newcomers as $registration) {
            $entries->enter($registration, $category, assignBib: false);
        }

        return $newcomers->count();
    }

    /**
     * Re-running the assignment never renumbers a runner who already has a
     * bib printed on their race pack.
     */
    private function numberUnnumberedRunners(RunningEventCategory $category): int
    {
        $unnumbered = $category->participants()
            ->whereNull('bib_number')
            ->orderBy('id')
            ->get();

        foreach ($unnumbered as $participant) {
            $this->assignTo($participant, $category);
        }

        return $unnumbered->count();
    }

    /**
     * Gives one runner the next free bib in their sequence. Men and women
     * run independent sequences when the distance sets separate starts
     * (PCR-style "1–2999 male, 3000+ female"); otherwise everyone shares
     * the distance's single sequence. Callers hold the transaction.
     */
    public function assignTo(RaceParticipant $participant, ?RunningEventCategory $category = null): string
    {
        $category ??= $participant->category;

        $bib = $this->nextAvailable($category, $participant->gender);
        $participant->update(['bib_number' => $bib]);

        return $bib;
    }

    /**
     * The next free bib in a sequence: one past the highest number already
     * handed to that sequence, never below its start, and skipping anything
     * already taken on the distance (a sequence that overran into another's
     * range, or a bib staff typed by hand).
     */
    public function nextAvailable(RunningEventCategory $category, ?string $gender = null): string
    {
        $taken = $this->takenBibs($category);
        $start = $category->bibStartFor($gender);
        $next = max($start, $this->highestNumberIn($category, $gender) + 1);

        while (isset($taken[$this->format($category, $next)])) {
            $next++;
        }

        return $this->format($category, $next);
    }

    private function format(RunningEventCategory $category, int $number): string
    {
        return ($category->bib_prefix ?? '').$number;
    }

    /**
     * The highest bib number handed out in a sequence so far. A sequence is
     * everyone whose gender resolves to the same start number: with no
     * gender-specific starts that is the whole distance; with "male from 1,
     * female from 3000" it is that gender's runners (and, for the start the
     * plain number shares, runners with no recorded gender).
     */
    private function highestNumberIn(RunningEventCategory $category, ?string $gender): int
    {
        $start = $category->bibStartFor($gender);
        $sameSequence = collect([...RunningEventCategory::GENDERS, null])
            ->filter(fn (?string $candidate) => $category->bibStartFor($candidate) === $start);

        $bibs = $category->participants()
            ->whereNotNull('bib_number')
            ->where(function ($query) use ($sameSequence) {
                $query->whereIn('gender', $sameSequence->filter()->values()->all());

                if ($sameSequence->containsStrict(null)) {
                    $query->orWhereNull('gender');
                }
            })
            ->pluck('bib_number');

        $prefix = $category->bib_prefix ?? '';
        $highest = 0;

        foreach ($bibs as $bib) {
            $bib = (string) $bib;

            if ($prefix !== '' && ! str_starts_with($bib, $prefix)) {
                continue;
            }

            $number = substr($bib, strlen($prefix));

            if (ctype_digit($number)) {
                $highest = max($highest, (int) $number);
            }
        }

        return $highest;
    }

    /**
     * The bibs already handed out on a distance, as a set to test against.
     *
     * @return array<string, true>
     */
    private function takenBibs(RunningEventCategory $category): array
    {
        $taken = [];

        foreach ($category->participants()->whereNotNull('bib_number')->pluck('bib_number') as $bib) {
            $taken[(string) $bib] = true;
        }

        return $taken;
    }
}
