<?php

namespace App\Services\Running;

use App\Models\RaceParticipant;
use App\Models\Registration;
use App\Models\RegistrationCategory;
use App\Models\RunningEventCategory;
use Carbon\CarbonImmutable;
use Carbon\CarbonInterface;
use Illuminate\Support\Facades\DB;

/**
 * The bridge from a registration to a distance's start list.
 *
 * A registration on a race category becomes a {@see RaceParticipant} the
 * moment it is confirmed — immediately for a free category, on Midtrans
 * settlement for a paid one — and gets its bib right then, so a runner sees
 * their number on the confirmation screen rather than waiting for a bulk
 * allocation. A registration that falls through (expired, rejected,
 * refunded) leaves the start list again, unless a result has already been
 * recorded against it.
 */
class RaceEntryService
{
    public function __construct(private readonly BibNumberAssigner $bibs) {}

    /**
     * Puts a registration on its distance's start list. Idempotent: a
     * registration already listed is returned as is, so a replayed webhook
     * or a bulk sweep never doubles an entry.
     */
    public function enter(Registration $registration, ?RunningEventCategory $category = null, bool $assignBib = true): ?RaceParticipant
    {
        $category ??= $this->distanceOf($registration);

        if ($category === null) {
            return null;
        }

        return DB::transaction(function () use ($registration, $category, $assignBib) {
            // Bib sequences are read-then-write, so two confirmations on the
            // same distance must take turns.
            $category = RunningEventCategory::whereKey($category->id)->lockForUpdate()->first();

            $existing = $category->participants()->where('registration_id', $registration->id)->first();

            if ($existing !== null) {
                return $existing;
            }

            $participant = $category->participants()->create([
                'registration_id' => $registration->id,
                'name' => $registration->name,
                'email' => $registration->email,
                'phone' => $registration->phone,
                'gender' => $this->genderOf($registration),
                'dob' => $this->dobOf($registration)?->toDateString(),
            ]);

            if ($assignBib) {
                $this->bibs->assignTo($participant, $category);
            }

            return $participant;
        });
    }

    /**
     * Takes a withdrawn registration off the start list. A runner who already
     * has a result stays: the registration record is not what timed them.
     */
    public function withdraw(Registration $registration): void
    {
        RaceParticipant::query()
            ->where('registration_id', $registration->id)
            ->where('status', RaceParticipant::STATUS_REGISTERED)
            ->whereNull('duration_seconds')
            ->delete();
    }

    public function distanceOf(Registration $registration): ?RunningEventCategory
    {
        $registration->loadMissing('registrationCategory.runningCategory');

        $category = $registration->registrationCategory;

        return $category?->isRaceEntry() ? $category->runningCategory : null;
    }

    /** The runner's gender as the form's `gender` field recorded it, if the form had one. */
    public function genderOf(Registration $registration): ?string
    {
        $gender = data_get($registration->form_data, RegistrationCategory::GENDER_KEY);

        return in_array($gender, RunningEventCategory::GENDERS, true) ? $gender : null;
    }

    public function dobOf(Registration $registration): ?CarbonInterface
    {
        $dob = data_get($registration->form_data, RegistrationCategory::DOB_KEY);

        if (! is_string($dob) || $dob === '') {
            return null;
        }

        try {
            return CarbonImmutable::parse($dob);
        } catch (\Throwable) {
            return null;
        }
    }

    /**
     * A validation rule for the form's date-of-birth answer: the runner must
     * be at least the distance's minimum age on race day. Null when the
     * distance sets no minimum, so callers can merge it unconditionally.
     */
    public function minimumAgeRule(RegistrationCategory $category): ?\Closure
    {
        $distance = $category->isRaceEntry() ? $category->runningCategory : null;

        if ($distance === null || $distance->minimum_age === null) {
            return null;
        }

        $minimum = $distance->minimum_age;
        $referenceDate = $distance->ageReferenceDate();

        return function (string $attribute, mixed $value, \Closure $fail) use ($minimum, $referenceDate) {
            try {
                $dob = CarbonImmutable::parse((string) $value);
            } catch (\Throwable) {
                return; // the `date` rule already reports this
            }

            if ($dob->diffInYears($referenceDate) < $minimum) {
                $fail(__('Runners must be at least :age years old on race day.', ['age' => $minimum]));
            }
        };
    }
}
