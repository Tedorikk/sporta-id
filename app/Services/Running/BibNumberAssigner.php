<?php

namespace App\Services\Running;

use App\Models\Registration;
use App\Models\RunningEventCategory;
use Illuminate\Support\Facades\DB;

/**
 * Turns confirmed registrations into a start list and hands every runner on
 * it a bib number.
 *
 * Both halves are deliberately one action: organizers allocate bibs once, a
 * few days before the race, and expect late entries to be swept in at the
 * same time.
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
     * Every confirmed registration on the linked registration category that
     * isn't on the start list yet joins it. Names and contact details are
     * copied rather than joined, so a runner survives their registration
     * being deleted.
     */
    private function addMissingRegistrants(RunningEventCategory $category): int
    {
        if ($category->registration_category_id === null) {
            return 0;
        }

        $alreadyListed = $category->participants()
            ->whereNotNull('registration_id')
            ->pluck('registration_id');

        $newcomers = Registration::query()
            ->where('registration_category_id', $category->registration_category_id)
            ->where('status', Registration::STATUS_CONFIRMED)
            ->whereNotIn('id', $alreadyListed)
            ->orderBy('id')
            ->get();

        foreach ($newcomers as $registration) {
            $category->participants()->create([
                'registration_id' => $registration->id,
                'name' => $registration->name,
                'email' => $registration->email,
                'phone' => $registration->phone,
            ]);
        }

        return $newcomers->count();
    }

    /**
     * Numbers run from the category's starting number upwards, skipping any
     * bib already handed out — re-running the assignment never renumbers a
     * runner who already has a bib printed on their race pack.
     */
    private function numberUnnumberedRunners(RunningEventCategory $category): int
    {
        $taken = $this->takenBibs($category);

        $unnumbered = $category->participants()
            ->whereNull('bib_number')
            ->orderBy('id')
            ->get();

        $next = max($category->bib_start_number, 1);

        foreach ($unnumbered as $participant) {
            while (isset($taken[$this->format($category, $next)])) {
                $next++;
            }

            $bib = $this->format($category, $next);
            $participant->update(['bib_number' => $bib]);
            $taken[$bib] = true;
            $next++;
        }

        return $unnumbered->count();
    }

    private function format(RunningEventCategory $category, int $number): string
    {
        return ($category->bib_prefix ?? '').$number;
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

    /**
     * The next free bib in a category — what a walk-in gets when staff add
     * them on race day without typing a number.
     */
    public function nextAvailable(RunningEventCategory $category): string
    {
        $taken = $this->takenBibs($category);
        $next = max($category->bib_start_number, 1);

        while (isset($taken[$this->format($category, $next)])) {
            $next++;
        }

        return $this->format($category, $next);
    }
}
