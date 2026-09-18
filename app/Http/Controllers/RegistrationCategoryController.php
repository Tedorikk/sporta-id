<?php

namespace App\Http\Controllers;

use App\Models\BasketballEvent;
use App\Models\BasketballEventCategory;
use App\Models\Event;
use App\Models\Payment;
use App\Models\Player;
use App\Models\RegistrationCategory;
use App\Models\RunningEvent;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;

class RegistrationCategoryController extends Controller
{
    public function index(Event $event)
    {
        return Inertia::render('dashboard/events/registration-categories/index', [
            'event' => $event,
            'isBasketballEvent' => $this->isBasketballEvent($event),
            'isRunningEvent' => $this->isRunningEvent($event),
            'registrationCategories' => $event->registrationCategories()
                ->with(['basketballCategory', 'runningCategory'])
                ->withCount('registrations')
                ->latest()
                ->get(),
        ]);
    }

    /**
     * Full-page form builder. With no `registration_category_id` this seeds
     * a blank category for creation; otherwise it loads the existing one
     * for editing — same single-action pattern as CardTemplateController::builder().
     */
    public function builder(Request $request, Event $event)
    {
        $registrationCategoryId = $request->integer('registration_category_id') ?: null;

        $registrationCategory = $registrationCategoryId
            ? $event->registrationCategories()->with('basketballCategory')->findOrFail($registrationCategoryId)
            : null;

        // The distance picker on an individual category, for a running
        // event: several categories (with/without jersey, early bird) can
        // name the same distance.
        $runningCategories = [];

        if ($event->specific instanceof RunningEvent) {
            $runningCategories = $event->specific->categories()
                ->orderBy('distance_meters')
                ->get(['id', 'name', 'distance_meters']);
        }

        return Inertia::render('dashboard/events/registration-categories/builder', [
            'event' => $event,
            'isBasketballEvent' => $this->isBasketballEvent($event),
            'isRunningEvent' => $this->isRunningEvent($event),
            'runningCategories' => $runningCategories,
            'registrationCategory' => $registrationCategory?->loadMissing('runningCategory'),
        ]);
    }

    /**
     * Streams every response for this category as CSV — column order mirrors
     * the fixed registration columns followed by the form's own field order.
     */
    public function exportResponses(Event $event, RegistrationCategory $registrationCategory)
    {
        abort_unless($registrationCategory->event_id === $event->id, 404);

        $fields = $registrationCategory->inputFields();
        $filename = Str::slug($registrationCategory->name).'-registrations.csv';

        return response()->streamDownload(function () use ($registrationCategory, $fields) {
            $handle = fopen('php://output', 'w');

            fputcsv($handle, array_merge(
                ['Name', 'Email', 'Phone', 'Status', 'Registered At'],
                collect($fields)->pluck('label')->all(),
            ));

            $registrationCategory->registrations()->orderBy('created_at')
                ->chunk(200, function ($registrations) use ($handle, $fields) {
                    foreach ($registrations as $registration) {
                        fputcsv($handle, array_merge([
                            $registration->name,
                            $registration->email,
                            $registration->phone,
                            $registration->status,
                            $registration->created_at?->toDateTimeString(),
                        ], collect($fields)->map(
                            fn (array $field) => data_get($registration->form_data, $field['key'])
                        )->all()));
                    }
                });

            fclose($handle);
        }, $filename, ['Content-Type' => 'text/csv']);
    }

    public function show(Request $request, Event $event, RegistrationCategory $registrationCategory)
    {
        abort_unless($registrationCategory->event_id === $event->id, 404);

        $filters = $request->only(['search', 'status']);

        $registrations = $registrationCategory->registrations()
            ->with([
                'team',
                // The settled payment if there is one, else the most recent
                // attempt — enough for an organizer to reconcile a disputed
                // payment without opening the Midtrans dashboard.
                'payments' => fn ($query) => $query->latest('id'),
            ])
            ->when($filters['search'] ?? null, fn ($q, $search) => $q->where('name', 'like', "%{$search}%"))
            ->when($filters['status'] ?? null, fn ($q, $status) => $q->where('status', $status))
            ->latest()
            ->paginate(15)
            ->withQueryString();

        $registrations->getCollection()->transform(function ($registration) {
            $payment = $registration->payments->firstWhere('status', Payment::STATUS_SETTLEMENT)
                ?? $registration->payments->first();

            $registration->unsetRelation('payments');
            $registration->setAttribute('payment', $payment);

            return $registration;
        });

        return Inertia::render('dashboard/events/registration-categories/show', [
            'event' => $event,
            'registrationCategory' => $registrationCategory,
            'registrations' => $registrations,
            'filters' => $filters,
        ]);
    }

    public function store(Request $request, Event $event)
    {
        $validated = $this->validated($request, $event);
        $tournament = $validated['tournament'] ?? null;
        unset($validated['tournament']);

        DB::transaction(function () use ($event, $validated, $tournament) {
            $registrationCategory = $event->registrationCategories()->create($validated);

            if ($tournament !== null) {
                $this->saveTournament($event, $registrationCategory, $tournament);
            }
        });

        return redirect()->route('registration_categories.index', $event)->with(['toast' => [
            'title' => 'Success',
            'description' => 'Registration category created successfully.',
        ]]);
    }

    public function update(Request $request, Event $event, RegistrationCategory $registrationCategory)
    {
        abort_unless($registrationCategory->event_id === $event->id, 404);

        $validated = $this->validated($request, $event);
        $tournament = $validated['tournament'] ?? null;
        unset($validated['tournament']);

        DB::transaction(function () use ($event, $registrationCategory, $validated, $tournament) {
            $registrationCategory->update($validated);

            if ($tournament !== null) {
                $this->saveTournament($event, $registrationCategory, $tournament);
            } elseif ($registrationCategory->basketballCategory) {
                // Tournament config can't be switched off from the form — its
                // teams, pools and matches hang off it — but the shared name
                // must still follow the category.
                $registrationCategory->basketballCategory->update(['name' => $registrationCategory->name]);
            }
        });

        return redirect()->route('registration_categories.index', $event)->with(['toast' => [
            'title' => 'Success',
            'description' => 'Registration category updated successfully.',
        ]]);
    }

    /**
     * Creates or updates the tournament config that turns a team category
     * into a basketball bracket: format, points, and roster limits.
     */
    private function saveTournament(Event $event, RegistrationCategory $registrationCategory, array $tournament): void
    {
        $basketballEvent = $event->specific;

        if (! $basketballEvent instanceof BasketballEvent) {
            throw ValidationException::withMessages(['tournament' => 'This event does not run a basketball tournament.']);
        }

        if ($registrationCategory->subject_type !== RegistrationCategory::SUBJECT_TEAM) {
            throw ValidationException::withMessages(['tournament' => 'Only team categories can run a tournament.']);
        }

        BasketballEventCategory::updateOrCreate(
            ['registration_category_id' => $registrationCategory->id],
            [
                ...$tournament,
                'basketball_event_id' => $basketballEvent->id,
                'name' => $registrationCategory->name,
            ],
        );

        // The roster block's player slot is a copy of these limits; keep the
        // stored form honest so the builder and any raw reader agree with
        // what rosterField() resolves.
        $registrationCategory->unsetRelation('basketballCategory');

        if ($registrationCategory->rosterField() !== null) {
            $registrationCategory->update(['form_pages' => $registrationCategory->formPagesForRegistrant()]);
        }
    }

    private function isBasketballEvent(Event $event): bool
    {
        $event->loadMissing('specific');

        return $event->specific instanceof BasketballEvent;
    }

    private function isRunningEvent(Event $event): bool
    {
        $event->loadMissing('specific');

        return $event->specific instanceof RunningEvent;
    }

    public function destroy(Event $event, RegistrationCategory $registrationCategory)
    {
        abort_unless($registrationCategory->event_id === $event->id, 404);

        if ($registrationCategory->registrations()->exists()) {
            return redirect()->route('registration_categories.index', $event)->with(['toast' => [
                'title' => 'Error',
                'description' => 'This category already has registrations and cannot be deleted.',
            ]]);
        }

        $registrationCategory->delete();

        return redirect()->route('registration_categories.index', $event)->with(['toast' => [
            'title' => 'Success',
            'description' => 'Registration category deleted successfully.',
        ]]);
    }

    /**
     * A roster block writes Player rows on a team, so only a team category
     * may carry one — and only one, since the members all land on the same
     * team sheet. It doesn't require a basketball tournament: a plain team
     * category can use it to collect members without a bracket.
     */
    private function validateRosterBlocks(Collection $fields, string $subjectType): void
    {
        $rosterBlocks = $fields->where('type', RegistrationCategory::ROSTER_TYPE);

        if ($rosterBlocks->isEmpty()) {
            return;
        }

        if ($rosterBlocks->count() > 1) {
            throw ValidationException::withMessages(['form_pages' => 'A form can only have one roster block.']);
        }

        if ($subjectType !== RegistrationCategory::SUBJECT_TEAM) {
            throw ValidationException::withMessages(['form_pages' => 'A roster block needs a team category.']);
        }

        $block = $rosterBlocks->first();

        if (empty($block['slots'])) {
            throw ValidationException::withMessages(['form_pages' => 'The roster block needs at least one slot (e.g. 5–12 players).']);
        }

        $memberKeys = collect($block['member_fields'] ?? [])->pluck('key');

        if ($memberKeys->count() !== $memberKeys->unique()->count()) {
            throw ValidationException::withMessages(['form_pages' => 'Roster member field keys must be unique.']);
        }
    }

    /**
     * The team-members block: a team category's generic, non-basketball
     * equivalent of the roster block. Its slot roles are whatever the
     * organiser typed (validated only for shape by the general rules, not
     * against Player::ROLES) rather than basketball's fixed set.
     */
    private function validateTeamMembersBlocks(Collection $fields, string $subjectType): void
    {
        $blocks = $fields->where('type', RegistrationCategory::TEAM_MEMBERS_TYPE);

        if ($blocks->isEmpty()) {
            return;
        }

        if ($blocks->count() > 1) {
            throw ValidationException::withMessages(['form_pages' => 'A form can only have one team-members block.']);
        }

        if ($subjectType !== RegistrationCategory::SUBJECT_TEAM) {
            throw ValidationException::withMessages(['form_pages' => 'A team-members block needs a team category.']);
        }

        if ($fields->where('type', RegistrationCategory::ROSTER_TYPE)->isNotEmpty()) {
            throw ValidationException::withMessages(['form_pages' => 'A form can\'t have both a roster block and a team-members block.']);
        }

        $block = $blocks->first();

        if (empty($block['slots'])) {
            throw ValidationException::withMessages(['form_pages' => 'The team-members block needs at least one role (e.g. 4–10 members).']);
        }

        $roleKeys = collect($block['slots'])->pluck('role');

        if ($roleKeys->count() !== $roleKeys->unique()->count()) {
            throw ValidationException::withMessages(['form_pages' => 'Team-members roles must be unique.']);
        }

        $memberKeys = collect($block['member_fields'] ?? [])->pluck('key');

        if ($memberKeys->count() !== $memberKeys->unique()->count()) {
            throw ValidationException::withMessages(['form_pages' => 'Team-members field keys must be unique.']);
        }
    }

    private function validated(Request $request, Event $event): array
    {
        $runningEventId = $event->specific instanceof RunningEvent ? $event->specific->id : null;

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'subject_type' => ['required', Rule::in(RegistrationCategory::SUBJECT_TYPES)],
            'price' => ['nullable', 'numeric', 'min:0'],
            'quota' => ['nullable', 'integer', 'min:1'],
            'registration_open' => ['nullable', 'boolean'],
            'opens_at' => ['nullable', 'date'],
            'closes_at' => ['nullable', 'date', 'after_or_equal:opens_at'],

            // Which distance this individual category sells entries to, on
            // a running event — several categories may name the same one.
            // Team categories are basketball's, and never sell a distance.
            'running_event_category_id' => [
                'nullable',
                Rule::prohibitedIf(fn () => ! $this->isRunningEvent($event) || $request->input('subject_type') === RegistrationCategory::SUBJECT_TEAM),
                Rule::exists('running_event_categories', 'id')->where(function ($query) use ($runningEventId) {
                    $query->where('running_event_id', $runningEventId);
                }),
            ],

            // Present only when a team category also runs a basketball
            // tournament; saveTournament() checks the event supports one.
            'tournament' => ['nullable', 'array', Rule::prohibitedIf(fn () => ! $this->isBasketballEvent($event))],
            'tournament.format' => ['required_with:tournament', Rule::in(BasketballEventCategory::FORMATS)],
            'tournament.win_points' => ['nullable', 'integer', 'min:0', 'max:10'],
            'tournament.loss_points' => ['nullable', 'integer', 'min:0', 'max:10'],
            'tournament.min_team' => ['required_with:tournament', 'integer', 'min:2'],
            'tournament.min_player_per_team' => ['required_with:tournament', 'integer', 'min:1'],
            'tournament.max_player_per_team' => ['nullable', 'integer', 'gte:tournament.min_player_per_team'],
            'tournament.max_player_per_coach' => ['nullable', 'integer', 'min:1'],
            'tournament.roster_closes_at' => ['nullable', 'date'],

            'form_pages' => ['nullable', 'array'],
            'form_pages.*.key' => ['required', 'string', 'max:100'],
            'form_pages.*.title' => ['required', 'string', 'max:255'],
            // Organisers paste whole rulebooks into these — a page intro, a
            // Description block's body, the thank-you note. Room for that; the
            // column is JSON, so the only ceiling worth having is a sane one.
            'form_pages.*.description' => ['nullable', 'string', 'max:20000'],
            'form_pages.*.fields' => ['nullable', 'array'],
            'form_pages.*.fields.*.key' => [
                'required', 'string', 'max:100', 'regex:/^[a-z0-9_]+$/',
                Rule::notIn(['name']),
            ],
            'form_pages.*.fields.*.label' => ['required', 'string', 'max:255'],
            'form_pages.*.fields.*.type' => ['required', Rule::in([
                'text', 'number', 'email', 'phone', 'date', 'select', 'radio', 'checkbox',
                'textarea', 'rating', 'signature', 'file', 'document', 'description',
                RegistrationCategory::ROSTER_TYPE, RegistrationCategory::TEAM_MEMBERS_TYPE,
            ])],
            'form_pages.*.fields.*.required' => ['nullable', 'boolean'],
            'form_pages.*.fields.*.options' => ['nullable', 'array'],
            'form_pages.*.fields.*.options.*' => ['string', 'max:255'],
            'form_pages.*.fields.*.help_text' => ['nullable', 'string', 'max:20000'],
            'form_pages.*.fields.*.min' => ['nullable', 'numeric'],
            'form_pages.*.fields.*.max' => ['nullable', 'numeric'],
            'form_pages.*.fields.*.error_message' => ['nullable', 'string', 'max:255'],
            'form_pages.*.fields.*.max_rating' => ['nullable', 'integer', 'min:1', 'max:10'],
            'form_pages.*.fields.*.image_ratio' => ['nullable', Rule::in(RegistrationCategory::IMAGE_RATIOS)],

            // Roster block: which roles, how many of each, and the extra
            // questions asked per member (their answers land in players.extra).
            'form_pages.*.fields.*.details_on_form' => ['nullable', 'boolean'],
            // The role slug: for a roster block, one of Player::ROLES; for a
            // team-members block, whatever the organiser typed (checked for
            // uniqueness in validateTeamMembersBlocks instead).
            'form_pages.*.fields.*.slots' => ['nullable', 'array'],
            'form_pages.*.fields.*.slots.*.role' => [
                'required', 'string', 'max:50', 'regex:/^[a-z0-9_]+$/',
                function (string $attribute, mixed $value, Closure $fail) use ($request) {
                    preg_match('/^(form_pages\.\d+\.fields\.\d+)\./', $attribute, $matches);
                    $fieldType = $request->input($matches[1].'.type');

                    if ($fieldType === RegistrationCategory::ROSTER_TYPE && ! in_array($value, Player::ROLES, true)) {
                        $fail('The selected :attribute is invalid.');
                    }
                },
            ],
            'form_pages.*.fields.*.slots.*.label' => ['nullable', 'string', 'max:100'],
            'form_pages.*.fields.*.slots.*.min' => ['required', 'integer', 'min:0'],
            'form_pages.*.fields.*.slots.*.max' => ['nullable', 'integer', 'gte:form_pages.*.fields.*.slots.*.min'],
            'form_pages.*.fields.*.member_fields' => ['nullable', 'array'],
            'form_pages.*.fields.*.member_fields.*.key' => ['required', 'string', 'max:100', 'regex:/^[a-z0-9_]+$/'],
            'form_pages.*.fields.*.member_fields.*.label' => ['required', 'string', 'max:255'],
            'form_pages.*.fields.*.member_fields.*.type' => ['required', Rule::in(RegistrationCategory::ROSTER_MEMBER_FIELD_TYPES)],
            'form_pages.*.fields.*.member_fields.*.required' => ['nullable', 'boolean'],
            'form_pages.*.fields.*.member_fields.*.options' => ['nullable', 'array'],
            'form_pages.*.fields.*.member_fields.*.options.*' => ['string', 'max:255'],
            // Which roles the question is asked of; empty means everyone.
            'form_pages.*.fields.*.member_fields.*.roles' => ['nullable', 'array'],
            'form_pages.*.fields.*.member_fields.*.roles.*' => [Rule::in(Player::ROLES)],

            'form_branding' => ['nullable', 'array'],
            'form_branding.primary_color' => ['nullable', 'string', 'max:20'],
            'form_branding.secondary_color' => ['nullable', 'string', 'max:20'],
            'form_branding.background_color' => ['nullable', 'string', 'max:20'],
            'form_branding.text_color' => ['nullable', 'string', 'max:20'],
            'form_branding.logo_url' => ['nullable', 'string', 'max:2048'],
            'form_branding.font_family' => ['nullable', 'string', 'max:100'],
            'form_branding.border_radius' => ['nullable', Rule::in(['sharp', 'rounded', 'pill'])],
            'form_branding.button_label' => ['nullable', 'string', 'max:50'],

            'form_settings' => ['nullable', 'array'],
            'form_settings.prevent_duplicate_by' => ['nullable', 'string', 'max:100'],
            'form_settings.confirmation_message' => ['nullable', 'string', 'max:20000'],
            'form_settings.post_submit_display' => ['nullable', Rule::in(['id_card', 'message'])],
            'form_settings.name_field_label' => ['nullable', 'string', 'max:100'],
            'form_settings.notify_emails' => ['nullable', 'array'],
            'form_settings.notify_emails.*' => ['email', 'max:255'],
        ], [
            'tournament.prohibited' => 'This event does not run a basketball tournament.',
            'form_pages.*.fields.*.key.regex' => 'Field key may only contain lowercase letters, numbers and underscores.',
            // "name" is always collected by the built-in Team/Full Name field and rendered
            // outside the dynamic field list — a custom field reusing that key would silently
            // never appear on the public form, so it's blocked here instead.
            'form_pages.*.fields.*.key.not_in' => '"name" is reserved for the built-in Name field — choose a different key, e.g. "participant_name".',
        ]);

        $fields = collect($validated['form_pages'] ?? [])->flatMap(fn (array $page) => $page['fields'] ?? []);
        $keys = $fields->pluck('key');

        if ($keys->count() !== $keys->unique()->count()) {
            abort(422, 'Field keys must be unique within a form.');
        }

        $this->validateRosterBlocks($fields, $validated['subject_type']);
        $this->validateTeamMembersBlocks($fields, $validated['subject_type']);

        return $validated;
    }
}
