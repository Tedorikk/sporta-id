<?php

namespace App\Http\Controllers;

use App\Models\CardTemplate;
use App\Models\Event;
use App\Models\Registration;
use App\Models\RegistrationCategory;
use App\Models\Team;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

class RegistrationController extends Controller
{
    /** Field keys that map to top-level Registration columns instead of form_data. */
    private const RESERVED_KEYS = ['name', 'email', 'phone', 'photo'];

    public function create(Event $event, RegistrationCategory $registrationCategory)
    {
        abort_unless($registrationCategory->event_id === $event->id, 404);

        return Inertia::render('register-dynamic', [
            'event' => $event,
            'registrationCategory' => $registrationCategory,
            'registrationClosed' => ! $registrationCategory->isOpen() || ! $registrationCategory->hasAvailableQuota(),
        ]);
    }

    public function store(Request $request, Event $event, RegistrationCategory $registrationCategory)
    {
        abort_unless($registrationCategory->event_id === $event->id, 404);

        $validated = $this->validated($request, $registrationCategory);

        $registration = DB::transaction(function () use ($validated, $event, $registrationCategory) {
            $category = RegistrationCategory::whereKey($registrationCategory->id)->lockForUpdate()->first();

            abort_unless($category->isOpen(), 403, 'Registration is closed for this category.');
            abort_unless($category->hasAvailableQuota(), 403, 'This category is full.');

            $team = null;

            if ($category->subject_type === RegistrationCategory::SUBJECT_TEAM) {
                $team = Team::create([
                    'event_id' => $event->id,
                    'name' => $validated['name'],
                    'status' => 'pending',
                ]);
            }

            $registration = Registration::create([
                'registration_category_id' => $category->id,
                'event_id' => $event->id,
                'team_id' => $team?->id,
                'name' => $validated['name'],
                'email' => $validated['email'] ?? null,
                'phone' => $validated['phone'] ?? null,
                'photo' => $validated['photo'] ?? null,
                'form_data' => $validated['form_data'] ?? [],
                // Payment gating (Midtrans) lands in a later phase — every
                // registration is confirmed immediately for now.
                'status' => Registration::STATUS_CONFIRMED,
            ]);

            $category->increment('registered_count');

            return $registration;
        });

        // Land back on the same registration page with the confirmed record
        // attached, so the form can swap in the real ID card immediately —
        // no redirect, no separate "thanks" page to navigate to.
        $registration->loadMissing('team.basketballEventCategory');

        return Inertia::render('register-dynamic', [
            'event' => $event,
            'registrationCategory' => $registrationCategory->fresh(),
            'registrationClosed' => false,
            'confirmedRegistration' => $registration,
            'cardTemplate' => $registrationCategory->subject_type === RegistrationCategory::SUBJECT_INDIVIDUAL
                ? CardTemplate::resolveFor($event, CardTemplate::SUBJECT_REGISTRATION, registrationCategoryId: $registrationCategory->id)
                : null,
        ]);
    }

    public function status(Registration $registration)
    {
        $registration->loadMissing(['registrationCategory', 'event', 'team']);

        return Inertia::render('registration-status', [
            'registration' => $registration,
        ]);
    }

    private function validated(Request $request, RegistrationCategory $registrationCategory): array
    {
        $rules = [
            'name' => ['required', 'string', 'max:255'],
        ];

        foreach ($registrationCategory->form_schema ?? [] as $field) {
            $key = $field['key'];
            $attribute = in_array($key, self::RESERVED_KEYS, true) ? $key : "form_data.$key";

            if ($key === 'name') {
                continue;
            }

            $rules[$attribute] = $this->fieldRules($field);
        }

        return $request->validate($rules);
    }

    private function fieldRules(array $field): array
    {
        $rules = [($field['required'] ?? false) ? 'required' : 'nullable'];

        return array_merge($rules, match ($field['type']) {
            'number' => ['numeric'],
            'email' => ['email', 'max:255'],
            'phone' => ['string', 'max:50'],
            'date' => ['date'],
            'select', 'radio' => [Rule::in($field['options'] ?? [])],
            'checkbox' => ['boolean'],
            'file', 'document' => ['url', 'max:255'],
            'textarea' => ['string', 'max:5000'],
            default => ['string', 'max:255'],
        });
    }
}
