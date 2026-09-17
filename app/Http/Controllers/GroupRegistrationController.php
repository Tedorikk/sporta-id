<?php

namespace App\Http\Controllers;

use App\Models\Event;
use App\Models\Payment;
use App\Models\Registration;
use App\Models\RegistrationCategory;
use App\Models\RegistrationOrder;
use App\Services\Midtrans\MidtransClient;
use App\Services\RegistrationConfirmationNotifier;
use App\Services\RegistrationFieldRules;
use App\Services\Running\RaceEntryService;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;

/**
 * One buyer registering several individuals in a single checkout — a parent
 * signing up three kids for the fun run, a group of friends entering a race
 * together — paying once for the summed total. Each participant still picks
 * their own category (their own distance, their own with/without-jersey
 * variant) and fills their own form; see {@see RegistrationOrder} for how
 * the one payment settles all of them together.
 *
 * Only individual categories are eligible: a team category's "participant"
 * is the whole team, entered through {@see RegistrationController} instead.
 */
class GroupRegistrationController extends Controller
{
    /** Field keys that map to top-level Registration columns instead of form_data. */
    private const RESERVED_KEYS = ['name', 'email', 'phone', 'photo'];

    public function __construct(
        private readonly MidtransClient $midtrans,
        private readonly RegistrationConfirmationNotifier $notifier,
        private readonly RegistrationFieldRules $fieldRuleBuilder,
        private readonly RaceEntryService $raceEntries,
    ) {}

    public function create(Event $event)
    {
        $categories = $event->registrationCategories()
            ->where('subject_type', RegistrationCategory::SUBJECT_INDIVIDUAL)
            ->orderBy('name')
            ->get()
            ->map(fn (RegistrationCategory $category) => $category->toPublicArray());

        return Inertia::render('group-registration', [
            'event' => $event,
            'categories' => $categories,
        ]);
    }

    public function store(Request $request, Event $event)
    {
        $participants = $request->input('participants');

        if (! is_array($participants) || count($participants) === 0) {
            throw ValidationException::withMessages(['participants' => __('Add at least one participant.')]);
        }

        $categories = $this->resolveCategories($event, $participants);
        $validated = $this->validateParticipants($request, $participants, $categories);

        $order = DB::transaction(function () use ($event, $validated, $categories) {
            return $this->createOrder($event, $validated, $categories);
        });

        if ($order->status === RegistrationOrder::STATUS_CONFIRMED) {
            foreach ($order->registrations as $registration) {
                $this->notifier->notify($registration);
            }
        }

        $snapToken = null;

        if ($order->status === RegistrationOrder::STATUS_PENDING_PAYMENT) {
            try {
                $snapToken = $this->createPayment($order)->snap_token;
            } catch (\Throwable $e) {
                report($e);
            }
        }

        return response()->json([
            'order_id' => $order->qr_token,
            'status' => $order->status,
            'snap_token' => $snapToken,
            'midtrans_client_key' => config('services.midtrans.client_key'),
            'midtrans_is_production' => (bool) config('services.midtrans.is_production'),
        ]);
    }

    public function pay(RegistrationOrder $registrationOrder)
    {
        abort_unless($registrationOrder->status === RegistrationOrder::STATUS_PENDING_PAYMENT, 403, __('This order is not awaiting payment.'));

        $payment = $this->createPayment($registrationOrder);

        return response()->json([
            'snap_token' => $payment->snap_token,
            'midtrans_client_key' => config('services.midtrans.client_key'),
            'midtrans_is_production' => (bool) config('services.midtrans.is_production'),
        ]);
    }

    public function status(RegistrationOrder $registrationOrder)
    {
        $registrationOrder->loadMissing(['event', 'registrations.registrationCategory']);

        return Inertia::render('registration-order-status', [
            'order' => $registrationOrder,
        ]);
    }

    /**
     * Every category a participant named, keyed by id — resolved once so the
     * validation pass and the creation pass agree on the same rows, and
     * scoped to the event in the URL so a payload can't smuggle in a
     * category from a different event.
     *
     * @param  array<int, array<string, mixed>>  $participants
     * @return Collection<int, RegistrationCategory>
     */
    private function resolveCategories(Event $event, array $participants): Collection
    {
        $ids = collect($participants)->pluck('registration_category_id')->filter()->unique()->values();

        if ($ids->isEmpty()) {
            throw ValidationException::withMessages(['participants' => __('Every participant needs a category.')]);
        }

        $categories = RegistrationCategory::whereIn('id', $ids)->where('event_id', $event->id)->get()->keyBy('id');

        foreach ($ids as $id) {
            $category = $categories->get($id);

            if ($category === null) {
                throw ValidationException::withMessages(['participants' => __('One of the selected categories no longer exists on this event.')]);
            }

            if ($category->subject_type !== RegistrationCategory::SUBJECT_INDIVIDUAL) {
                throw ValidationException::withMessages(['participants' => __('":name" is a team category and cannot be entered here.', ['name' => $category->name])]);
            }
        }

        return $categories;
    }

    /**
     * Validates every participant's answers against their own category's
     * form, with each error keyed to its participant's index — e.g.
     * `participants.2.form_data.dob` — so the client can point a manager at
     * exactly the runner who needs fixing.
     *
     * @param  array<int, array<string, mixed>>  $participants
     * @param  Collection<int, RegistrationCategory>  $categories
     * @return array{participants: array<int, array<string, mixed>>}
     */
    private function validateParticipants(Request $request, array $participants, Collection $categories): array
    {
        $rules = [
            'participants' => ['required', 'array', 'min:1'],
            'website' => ['prohibited'], // honeypot, shared across the whole order
        ];
        $messages = [];
        $attributes = [];

        foreach ($participants as $index => $participant) {
            $category = $categories->get($participant['registration_category_id'] ?? null);
            $prefix = "participants.$index";

            $rules["$prefix.registration_category_id"] = ['required', 'integer'];
            $rules["$prefix.name"] = ['required', 'string', 'max:255'];
            $attributes["$prefix.name"] = $category?->form_settings['name_field_label'] ?? __('Full Name');

            if ($category === null) {
                continue;
            }

            foreach ($category->inputFields() as $field) {
                $key = $field['key'];

                if ($key === 'name') {
                    continue;
                }

                $attribute = in_array($key, self::RESERVED_KEYS, true) ? "$prefix.$key" : "$prefix.form_data.$key";
                $rules[$attribute] = $this->fieldRuleBuilder->forField($field);
                $attributes[$attribute] = $field['label'] ?? $key;

                if (! empty($field['error_message'])) {
                    $messages["$attribute.required"] = $field['error_message'];
                }

                if ($key === RegistrationCategory::DOB_KEY) {
                    $ageRule = $this->raceEntries->minimumAgeRule($category);

                    if ($ageRule !== null) {
                        $rules[$attribute][] = $ageRule;
                    }
                }
            }

            if (! $category->isFree()) {
                $rules["$prefix.email"] = ['required', 'email', 'max:255'];
                $messages["$prefix.email.required"] = __('An email address is required so we can send a payment receipt and confirmation.');
                $attributes["$prefix.email"] ??= __('Email Address');
            }
        }

        return $request->validate($rules, $messages, $attributes);
    }

    /**
     * One RegistrationOrder plus one Registration per participant, quota
     * checked and reserved per category under lock so two orders racing for
     * the last slots can't both win it. A wholly free order is confirmed
     * (and every participant entered) immediately, same as a free solo
     * registration; a paid one stays pending until Midtrans settles.
     *
     * @param  array{participants: array<int, array<string, mixed>>}  $validated
     * @param  Collection<int, RegistrationCategory>  $categories
     */
    private function createOrder(Event $event, array $validated, Collection $categories): RegistrationOrder
    {
        $participants = $validated['participants'];
        $isFree = $categories->every(fn (RegistrationCategory $category) => $category->isFree());

        $order = RegistrationOrder::create([
            'event_id' => $event->id,
            'status' => $isFree ? RegistrationOrder::STATUS_CONFIRMED : RegistrationOrder::STATUS_PENDING_PAYMENT,
            'expires_at' => $isFree ? null : now()->addDay(),
            'locale' => app()->getLocale(),
        ]);

        foreach ($categories as $categoryId => $unlocked) {
            $category = RegistrationCategory::whereKey($categoryId)->lockForUpdate()->first();
            $entrants = collect($participants)->filter(fn (array $p) => (int) $p['registration_category_id'] === (int) $categoryId);

            abort_unless($category->isOpen(), 403, __(':category is closed for registration.', ['category' => $category->name]));

            if ($category->quota !== null && $category->registered_count + $entrants->count() > $category->quota) {
                throw ValidationException::withMessages([
                    'participants' => __('Only :slots slot(s) left for :category.', [
                        'slots' => max($category->quota - $category->registered_count, 0),
                        'category' => $category->name,
                    ]),
                ]);
            }

            foreach ($entrants as $participant) {
                Registration::create([
                    'registration_category_id' => $category->id,
                    'registration_order_id' => $order->id,
                    'event_id' => $event->id,
                    'name' => $participant['name'],
                    'email' => $participant['email'] ?? null,
                    'phone' => $participant['phone'] ?? null,
                    'photo' => $participant['photo'] ?? null,
                    'form_data' => $participant['form_data'] ?? [],
                    'status' => $isFree ? Registration::STATUS_CONFIRMED : Registration::STATUS_PENDING_PAYMENT,
                    'locale' => app()->getLocale(),
                ]);
            }

            $category->increment('registered_count', $entrants->count());
        }

        return $order->fresh('registrations.registrationCategory');
    }

    private function createPayment(RegistrationOrder $order): Payment
    {
        $order->loadMissing('registrations.registrationCategory');
        $amount = $order->registrations->sum(fn (Registration $r) => (float) $r->registrationCategory->price);

        $payment = $order->payments()->create([
            'order_id' => 'ORD-'.$order->id.'-'.Str::random(6),
            'amount' => $amount,
        ]);

        $payment->setRelation('payable', $order);

        $payment->snap_token = $this->midtrans->createSnapTransaction($payment);
        $payment->save();

        return $payment;
    }
}
