<?php

namespace App\Http\Controllers;

use App\Http\Resources\PaymentResource;
use App\Models\CardTemplate;
use App\Models\Event;
use App\Models\Payment;
use App\Models\Registration;
use App\Models\RegistrationCategory;
use App\Models\Team;
use App\Services\Basketball\RosterService;
use App\Services\Payments\CheckoutResult;
use App\Services\Payments\PaymentCheckoutService;
use App\Services\RegistrationConfirmationNotifier;
use App\Services\RegistrationFieldRules;
use App\Services\Running\RaceEntryService;
use App\Services\TeamMembers\TeamMemberService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Inertia\Inertia;

class RegistrationController extends Controller
{
    /** Field keys that map to top-level Registration columns instead of form_data. */
    private const RESERVED_KEYS = ['name', 'email', 'phone', 'photo'];

    public function __construct(
        private readonly PaymentCheckoutService $checkoutService,
        private readonly RegistrationConfirmationNotifier $notifier,
        private readonly RegistrationFieldRules $fieldRuleBuilder,
        private readonly RaceEntryService $raceEntries,
    ) {}

    public function create(Event $event, RegistrationCategory $registrationCategory)
    {
        abort_unless($registrationCategory->event_id === $event->id, 404);

        return Inertia::render('register-dynamic', [
            'event' => $event,
            'registrationCategory' => $this->forRegistrant($registrationCategory),
            'registrationClosed' => ! $registrationCategory->isOpen() || ! $registrationCategory->hasAvailableQuota(),
            // For the "what you'll need" card: when a team must have its
            // roster complete, if the form defers member details to the portal.
            'rosterDeadline' => $registrationCategory->rosterField() ? $registrationCategory->rosterClosesAt() : null,
            // The roster block only asks for a jersey number and identity/birth
            // details when they feed a bracket.
            'isTournament' => $registrationCategory->isTeamTournament(),
        ]);
    }

    public function store(Request $request, Event $event, RegistrationCategory $registrationCategory)
    {
        abort_unless($registrationCategory->event_id === $event->id, 404);

        $validated = $this->validated($request, $registrationCategory);
        $members = $this->validatedTeamEntries($request, $registrationCategory);

        $this->guardAgainstDuplicate($validated, $registrationCategory);

        $registration = DB::transaction(function () use ($validated, $members, $event, $registrationCategory) {
            $category = RegistrationCategory::whereKey($registrationCategory->id)->lockForUpdate()->first();

            abort_unless($category->isOpen(), 403, __('Registration is closed for this category.'));
            abort_unless($category->hasAvailableQuota(), 403, __('This category is full.'));

            $team = null;

            if ($category->subject_type === RegistrationCategory::SUBJECT_TEAM) {
                $team = Team::create([
                    'event_id' => $event->id,
                    'name' => $validated['name'],
                    'logo' => $validated['form_data'][RegistrationCategory::TEAM_LOGO_KEY] ?? null,
                    'status' => Team::STATUS_PENDING,
                    // Puts the team straight into its bracket's category so it
                    // shows up for pooling and standings once verified.
                    'basketball_event_category_id' => $category->basketballCategory?->id,
                ]);

                // The roster/team-members block's entries go straight onto
                // the team sheet, so the entry is complete at registration;
                // the manager's portal takes over for edits after this.
                foreach ($members as $member) {
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
                // Remembered so the confirmation the webhook sends later is
                // in the language the registrant actually read the form in.
                'locale' => app()->getLocale(),
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

        $checkoutResult = null;

        if ($registration->status === Registration::STATUS_PENDING_PAYMENT) {
            if ($registrationCategory->usesManualPayment()) {
                // No gateway to call — the registrant uploads a transfer proof
                // (uploadProof()) and an organizer verifies it by hand.
                $this->createManualPayment($registration, $registrationCategory);
            } else {
                // The registration itself (and its quota slot) is already committed at
                // this point — if the gateway is unreachable or misconfigured, don't turn
                // that into a 500. The registrant lands on the pending-payment view
                // with no checkout yet; "Pay Now" there (or on the status page) retries.
                try {
                    $checkoutResult = $this->createCheckout($registration);
                } catch (\Throwable $e) {
                    report($e);
                }
            }
        }

        return Inertia::render('register-dynamic', [
            'event' => $event,
            'registrationCategory' => $this->forRegistrant($registrationCategory->fresh()),
            'registrationClosed' => false,
            'confirmedRegistration' => $registration,
            'cardTemplate' => $registration->status === Registration::STATUS_CONFIRMED
                && $registrationCategory->subject_type === RegistrationCategory::SUBJECT_INDIVIDUAL
                ? CardTemplate::resolveFor($event, CardTemplate::SUBJECT_REGISTRATION, registrationCategoryId: $registrationCategory->id)
                : null,
            ...$this->checkoutPayload($registration, $checkoutResult),
        ]);
    }

    /**
     * Removes a registration answer outright — for a mistaken or duplicate
     * submission, not a legitimate withdrawal (that stays as a record via
     * refund/cancel instead). Blocked once the entry has produced downstream
     * data that would be lost with it: a settled payment, a team that has
     * already played, or a finished race result.
     */
    public function destroy(Event $event, Registration $registration)
    {
        abort_unless($registration->event_id === $event->id, 404);

        $registration->loadMissing([
            'team.homeMatches', 'team.awayMatches', 'team.pools', 'raceParticipant', 'registrationOrder',
        ]);

        $hasSettledPayment = $registration->registration_order_id !== null
            ? $registration->registrationOrder?->payments()->where('status', Payment::STATUS_SETTLEMENT)->exists()
            : $registration->payments()->where('status', Payment::STATUS_SETTLEMENT)->exists();

        abort_if($hasSettledPayment, 422, 'This registration has a settled payment — refund it instead of deleting.');

        if ($registration->team !== null) {
            $hasCompeted = $registration->team->homeMatches->isNotEmpty()
                || $registration->team->awayMatches->isNotEmpty()
                || $registration->team->pools->isNotEmpty();

            abort_if($hasCompeted, 422, 'This team has already been placed in the tournament — reject it instead of deleting.');
        }

        abort_if(
            $registration->raceParticipant?->duration_seconds !== null,
            422,
            'This entry already has a race result recorded — it cannot be deleted.'
        );

        DB::transaction(function () use ($registration) {
            $locked = Registration::whereKey($registration->id)->lockForUpdate()->first();

            if (! $locked->isWithdrawn()) {
                $locked->registrationCategory()->decrement('registered_count');
            }

            // Abandoned Snap tokens, not real transactions — the settled-payment
            // guard above already ruled out anything that actually moved money.
            if ($locked->registration_order_id === null) {
                $locked->payments()->delete();
            }

            $team = $locked->team;
            $locked->delete();
            $team?->delete();
        });

        return back()->with(['toast' => [
            'title' => 'Success',
            'description' => 'Registration deleted.',
        ]]);
    }

    /**
     * Issues a fresh checkout for a still-pending registration — used when
     * the organizer's "Pay Now" retry is clicked from the status page.
     */
    public function pay(Registration $registration)
    {
        abort_unless($registration->status === Registration::STATUS_PENDING_PAYMENT, 403, __('This registration is not awaiting payment.'));
        abort_if($registration->registrationCategory->usesManualPayment(), 404);

        $result = $this->createCheckout($registration);

        if (! $result->success) {
            return response()->json([
                'error' => $result->error,
                'can_retry' => $result->canRetry,
            ], $result->canRetry ? 503 : 400);
        }

        return response()->json($this->checkoutPayload($registration, $result));
    }

    public function status(Registration $registration)
    {
        $registration->loadMissing(['registrationCategory', 'event', 'team.basketballEventCategory']);

        return Inertia::render('registration-status', [
            'registration' => $registration,
            'payment' => $registration->latestPayment()
                ? PaymentResource::make($registration->latestPayment())
                : null,
        ]);
    }

    /**
     * Attaches a registrant's uploaded transfer screenshot to their pending
     * manual payment. This never changes the payment's status — it stays
     * `pending` until an organizer approves or rejects it (ManualPaymentVerificationController) —
     * so it can safely be called again if the registrant replaces the file
     * before it's been reviewed.
     */
    public function uploadProof(Request $request, Registration $registration)
    {
        abort_unless($registration->status === Registration::STATUS_PENDING_PAYMENT, 403, __('This registration is not awaiting payment.'));

        $registration->loadMissing('registrationCategory');
        abort_unless($registration->registrationCategory->usesManualPayment(), 404);

        $validated = $request->validate([
            'proof_path' => ['required', 'string', 'max:2048'],
            'payer_account_name' => ['required', 'string', 'max:255'],
        ]);

        $payment = $registration->payments()->whereNull('verified_at')->latest('id')->first();

        abort_if($payment === null, 422, __('No pending payment found for this registration.'));

        $payment->update($validated);

        return back()->with(['toast' => [
            'title' => 'Success',
            'description' => __('Payment proof submitted — we’ll confirm your registration once it’s reviewed.'),
        ]]);
    }

    /**
     * The category as the form renders it: form pages with the roster block's
     * player slot resolved from the tournament (RegistrationCategory::formPagesForRegistrant).
     *
     * @return array<string, mixed>
     */
    private function forRegistrant(RegistrationCategory $registrationCategory): array
    {
        return [
            ...$registrationCategory->toArray(),
            'form_pages' => $registrationCategory->formPagesForRegistrant(),
        ];
    }

    private function createCheckout(Registration $registration): CheckoutResult
    {
        $successUrl = route('registrations.status', $registration);
        $failureUrl = route('registrations.status', $registration);

        return $this->checkoutService->getOrCreateCheckout(
            $registration,
            $successUrl,
            $failureUrl
        );
    }

    /** @return array<string, mixed> */
    private function checkoutPayload(Registration $registration, ?CheckoutResult $result): array
    {
        if ($result === null || ! $result->success) {
            return [
                'provider' => null,
                'checkoutUrl' => null,
                'snapToken' => null,
                'midtransClientKey' => config('services.midtrans.client_key'),
                'midtransIsProduction' => (bool) config('services.midtrans.is_production'),
            ];
        }

        $provider = $registration->payments()->latest('id')->value('provider');

        return [
            'provider' => $provider,
            'checkoutUrl' => $provider === Payment::PROVIDER_XENDIT ? $result->checkoutUrl : null,
            'snapToken' => $provider === Payment::PROVIDER_MIDTRANS ? $result->sessionId : null,
            'expiresAt' => $result->expiresAt?->format(DATE_ATOM),
            'midtransClientKey' => config('services.midtrans.client_key'),
            'midtransIsProduction' => (bool) config('services.midtrans.is_production'),
        ];
    }

    private function createManualPayment(Registration $registration, RegistrationCategory $registrationCategory): Payment
    {
        return $registration->payments()->create([
            'order_id' => 'REG-'.$registration->id.'-'.Str::random(6),
            'amount' => $registrationCategory->price,
            'provider' => Payment::PROVIDER_MANUAL,
            'currency' => 'IDR',
        ]);
    }

    /**
     * The category's roster or team-members block entries, validated against
     * the block's slots and per-member questions. A category never carries
     * both, so at most one of these returns anything.
     *
     * @return array<int, array<string, mixed>>
     */
    private function validatedTeamEntries(Request $request, RegistrationCategory $registrationCategory): array
    {
        $roster = $this->validatedRoster($request, $registrationCategory);

        if ($roster !== []) {
            return $roster;
        }

        return $this->validatedTeamMembers($request, $registrationCategory);
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
            $roster->submissionRules($rosterField, $registrationCategory->isTeamTournament()),
            $roster->messages(),
            $roster->attributes($rosterField['member_fields'] ?? []),
        );

        $roster->assertSubmissionFits($validated['roster'], $rosterField);

        return $validated['roster'];
    }

    /**
     * The team-members block's entries, validated against the block's slots
     * and per-member questions; an empty array when the form has no block.
     *
     * @return array<int, array<string, mixed>>
     */
    private function validatedTeamMembers(Request $request, RegistrationCategory $registrationCategory): array
    {
        $block = $registrationCategory->teamMembersField();

        if ($block === null) {
            return [];
        }

        $service = app(TeamMemberService::class);

        $validated = $request->validate(
            $service->submissionRules($block),
            $service->messages(),
            $service->attributes($block['member_fields'] ?? []),
        );

        $service->assertSubmissionFits($validated['members'], $block);

        return $validated['members'];
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
        // Errors name the field the way the organiser labelled it on the form,
        // not "form data.shirt size".
        $attributes = ['name' => $registrationCategory->form_settings['name_field_label'] ?? __('Full Name')];

        foreach ($registrationCategory->inputFields() as $field) {
            $key = $field['key'];

            if ($key === 'name') {
                continue;
            }

            $attribute = in_array($key, self::RESERVED_KEYS, true) ? $key : "form_data.$key";
            $rules[$attribute] = $this->fieldRuleBuilder->forField($field);
            $attributes[$attribute] = $field['label'] ?? $key;

            // A race entry's date-of-birth answer must also clear the
            // distance's minimum age, on top of the field's own rules.
            if ($key === RegistrationCategory::DOB_KEY) {
                $ageRule = $this->raceEntries->minimumAgeRule($registrationCategory);

                if ($ageRule !== null) {
                    $rules[$attribute][] = $ageRule;
                }
            }

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
            $messages['email.required'] = __('An email address is required so we can send your payment receipt and confirmation.');
            $attributes['email'] ??= __('Email Address');
        }

        return $request->validate($rules, $messages, $attributes);
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

        abort_if($exists, 422, __('You’ve already registered for this category with that :field.', ['field' => $duplicateField]));
    }
}
