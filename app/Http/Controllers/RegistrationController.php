<?php

namespace App\Http\Controllers;

use App\Models\CardTemplate;
use App\Models\Event;
use App\Models\Payment;
use App\Models\Registration;
use App\Models\RegistrationCategory;
use App\Models\Team;
use App\Services\Basketball\RosterService;
use App\Services\Midtrans\MidtransClient;
use App\Services\RegistrationConfirmationNotifier;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

class RegistrationController extends Controller
{
    /** Field keys that map to top-level Registration columns instead of form_data. */
    private const RESERVED_KEYS = ['name', 'email', 'phone', 'photo'];

    public function __construct(
        private readonly MidtransClient $midtrans,
        private readonly RegistrationConfirmationNotifier $notifier,
    ) {}

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
        $roster = $this->validatedRoster($request, $registrationCategory);

        $this->guardAgainstDuplicate($validated, $registrationCategory);

        $registration = DB::transaction(function () use ($validated, $roster, $event, $registrationCategory) {
            $category = RegistrationCategory::whereKey($registrationCategory->id)->lockForUpdate()->first();

            abort_unless($category->isOpen(), 403, 'Registration is closed for this category.');
            abort_unless($category->hasAvailableQuota(), 403, 'This category is full.');

            $team = null;

            if ($category->subject_type === RegistrationCategory::SUBJECT_TEAM) {
                $team = Team::create([
                    'event_id' => $event->id,
                    'name' => $validated['name'],
                    'status' => Team::STATUS_PENDING,
                    // Puts the team straight into its bracket's category so it
                    // shows up for pooling and standings once verified.
                    'basketball_event_category_id' => $category->basketballCategory?->id,
                ]);

                // The roster block's officials and players go straight onto
                // the team sheet, so the entry is complete at registration;
                // the captain's portal takes over for edits after this.
                foreach ($roster as $member) {
                    $team->players()->create($member);
                }
            }

            $isFree = $category->isFree();

            $registration = Registration::create([
                'registration_category_id' => $category->id,
                'event_id' => $event->id,
                'team_id' => $team?->id,
                'name' => $validated['name'],
                'email' => $validated['email'] ?? null,
                'phone' => $validated['phone'] ?? null,
                'photo' => $validated['photo'] ?? null,
                'form_data' => $validated['form_data'] ?? [],
                // Paid categories stay pending_payment (the model default) until
                // the Midtrans webhook confirms settlement; quota is still
                // reserved immediately, same as a free registration.
                'status' => $isFree ? Registration::STATUS_CONFIRMED : Registration::STATUS_PENDING_PAYMENT,
                'expires_at' => $isFree ? null : now()->addDay(),
            ]);

            $category->increment('registered_count');

            return $registration;
        });

        // Land back on the same registration page with the confirmed record
        // attached, so the form can swap in the real ID card immediately —
        // no redirect, no separate "thanks" page to navigate to.
        $registration->loadMissing(['team.basketballEventCategory', 'event', 'registrationCategory']);

        if ($registration->status === Registration::STATUS_CONFIRMED) {
            $this->notifier->notify($registration);
        }

        $snapToken = null;

        if ($registration->status === Registration::STATUS_PENDING_PAYMENT) {
            // The registration itself (and its quota slot) is already committed at
            // this point — if Midtrans is unreachable or misconfigured, don't turn
            // that into a 500. The registrant lands on the pending-payment view
            // with no token yet; "Pay Now" there (or on the status page) retries.
            try {
                $snapToken = $this->createPayment($registration, $registrationCategory)->snap_token;
            } catch (\Throwable $e) {
                report($e);
            }
        }

        return Inertia::render('register-dynamic', [
            'event' => $event,
            'registrationCategory' => $registrationCategory->fresh(),
            'registrationClosed' => false,
            'confirmedRegistration' => $registration,
            'cardTemplate' => $registration->status === Registration::STATUS_CONFIRMED
                && $registrationCategory->subject_type === RegistrationCategory::SUBJECT_INDIVIDUAL
                ? CardTemplate::resolveFor($event, CardTemplate::SUBJECT_REGISTRATION, registrationCategoryId: $registrationCategory->id)
                : null,
            'snapToken' => $snapToken,
            'midtransClientKey' => config('services.midtrans.client_key'),
            'midtransIsProduction' => (bool) config('services.midtrans.is_production'),
        ]);
    }

    /**
     * Issues a fresh Snap token for a still-pending registration — used when
     * the organizer's "Pay Now" retry is clicked from the status page,
     * e.g. after the first token has expired or the popup was closed.
     */
    public function pay(Registration $registration)
    {
        abort_unless($registration->status === Registration::STATUS_PENDING_PAYMENT, 403, 'This registration is not awaiting payment.');

        $payment = $this->createPayment($registration, $registration->registrationCategory);

        return response()->json([
            'snap_token' => $payment->snap_token,
            'midtrans_client_key' => config('services.midtrans.client_key'),
            'midtrans_is_production' => (bool) config('services.midtrans.is_production'),
        ]);
    }

    public function status(Registration $registration)
    {
        $registration->loadMissing(['registrationCategory', 'event', 'team.basketballEventCategory']);

        return Inertia::render('registration-status', [
            'registration' => $registration,
        ]);
    }

    private function createPayment(Registration $registration, RegistrationCategory $registrationCategory): Payment
    {
        $payment = $registration->payments()->create([
            'order_id' => 'REG-'.$registration->id.'-'.Str::random(6),
            'amount' => $registrationCategory->price,
        ]);

        $payment->setRelation('payable', $registration);

        $payment->snap_token = $this->midtrans->createSnapTransaction($payment);
        $payment->save();

        return $payment;
    }

    /**
     * The roster block's members, validated against the block's slots and
     * per-member questions; an empty array when the form has no block.
     *
     * @return array<int, array<string, mixed>>
     */
    private function validatedRoster(Request $request, RegistrationCategory $registrationCategory): array
    {
        $rosterField = $registrationCategory->rosterField();

        if ($rosterField === null) {
            return [];
        }

        $roster = app(RosterService::class);

        $validated = $request->validate(
            $roster->submissionRules($rosterField),
            $roster->messages(),
            $roster->attributes($rosterField['member_fields'] ?? []),
        );

        $roster->assertSubmissionFits($validated['roster'], $rosterField);

        return $validated['roster'];
    }

    private function validated(Request $request, RegistrationCategory $registrationCategory): array
    {
        $rules = [
            'name' => ['required', 'string', 'max:255'],
            // Hidden honeypot input — real visitors never see or fill it, so any
            // value here is a strong bot signal. No external CAPTCHA needed.
            'website' => ['prohibited'],
        ];
        $messages = [];

        foreach ($registrationCategory->inputFields() as $field) {
            $key = $field['key'];

            if ($key === 'name') {
                continue;
            }

            $attribute = in_array($key, self::RESERVED_KEYS, true) ? $key : "form_data.$key";
            $rules[$attribute] = $this->fieldRules($field);

            if (! empty($field['error_message'])) {
                $messages["$attribute.required"] = $field['error_message'];
            }
        }

        // A paid registration must carry an email address whatever the organizer
        // put on the form: it's the only channel the payer gets a Midtrans
        // receipt and our confirmation on. Deliberately set after the loop so it
        // also overrides an `email` field the organizer marked optional.
        if (! $registrationCategory->isFree()) {
            $rules['email'] = ['required', 'email', 'max:255'];
            $messages['email.required'] = 'An email address is required so we can send your payment receipt and confirmation.';
        }

        return $request->validate($rules, $messages);
    }

    private function fieldRules(array $field): array
    {
        $rules = [($field['required'] ?? false) ? 'required' : 'nullable'];

        return array_merge($rules, match ($field['type']) {
            'number' => array_values(array_filter([
                'numeric',
                isset($field['min']) ? 'min:'.$field['min'] : null,
                isset($field['max']) ? 'max:'.$field['max'] : null,
            ])),
            'email' => ['email', 'max:255'],
            // Digits, spaces, and the common +/-/() separators — loose enough for
            // international formats while still rejecting free-text garbage.
            'phone' => ['string', 'max:50', 'regex:/^[0-9+\-\s()]{6,25}$/'],
            'date' => ['date'],
            'select', 'radio' => [Rule::in($field['options'] ?? [])],
            'checkbox' => ['boolean'],
            'rating' => ['integer', 'between:1,'.($field['max_rating'] ?? 5)],
            'file', 'document', 'signature' => ['url', 'max:255'],
            'textarea' => ['string', 'max:5000'],
            default => ['string', 'max:255'],
        });
    }

    /**
     * When the category has `prevent_duplicate_by` set, blocks a second
     * submission sharing that same value — checked before the transaction
     * so a duplicate never touches quota or creates a stray record.
     */
    private function guardAgainstDuplicate(array $validated, RegistrationCategory $registrationCategory): void
    {
        $duplicateField = $registrationCategory->form_settings['prevent_duplicate_by'] ?? null;

        if (! $duplicateField) {
            return;
        }

        $query = $registrationCategory->registrations();

        $exists = in_array($duplicateField, self::RESERVED_KEYS, true)
            ? $query->where($duplicateField, $validated[$duplicateField] ?? null)->exists()
            : $query->where("form_data->{$duplicateField}", data_get($validated, "form_data.{$duplicateField}"))->exists();

        abort_if($exists, 422, "You've already registered for this category with that {$duplicateField}.");
    }
}
