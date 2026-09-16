<?php

namespace App\Models;

use Carbon\CarbonInterface;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Support\Str;

class RegistrationCategory extends Model
{
    use HasFactory;

    public const SUBJECT_TEAM = 'team';

    public const SUBJECT_INDIVIDUAL = 'individual';

    public const SUBJECT_TYPES = [
        self::SUBJECT_TEAM,
        self::SUBJECT_INDIVIDUAL,
    ];

    protected $fillable = [
        'event_id', 'running_event_category_id', 'name', 'slug', 'subject_type', 'price', 'quota',
        'registered_count', 'registration_open', 'opens_at', 'closes_at',
        'form_pages', 'form_branding', 'form_settings', 'status',
    ];

    protected $casts = [
        'price' => 'decimal:2',
        'quota' => 'integer',
        'registered_count' => 'integer',
        'registration_open' => 'boolean',
        'opens_at' => 'datetime',
        'closes_at' => 'datetime',
        'form_pages' => 'array',
        'form_branding' => 'array',
        'form_settings' => 'array',
    ];

    // Mirrors the DB column defaults so a freshly `create()`d instance reflects
    // them in-memory too, without needing a round trip back to the database.
    protected $attributes = [
        'registered_count' => 0,
        'registration_open' => true,
        'status' => 'active',
    ];

    protected static function boot()
    {
        parent::boot();

        static::creating(function (self $category) {
            if (empty($category->slug)) {
                $category->slug = Str::slug($category->name).'-'.Str::lower(Str::random(4));
            }
        });
    }

    /** @return BelongsTo<Event, $this> */
    public function event(): BelongsTo
    {
        return $this->belongsTo(Event::class);
    }

    /** @return HasMany<Registration, $this> */
    public function registrations(): HasMany
    {
        return $this->hasMany(Registration::class);
    }

    /** @return HasOne<BasketballEventCategory, $this> */
    public function basketballCategory(): HasOne
    {
        return $this->hasOne(BasketballEventCategory::class);
    }

    /**
     * The distance this category sells entries to. Several categories may
     * name the same distance (with/without jersey, early bird), so the
     * link lives here rather than on the distance.
     *
     * @return BelongsTo<RunningEventCategory, $this>
     */
    public function runningCategory(): BelongsTo
    {
        return $this->belongsTo(RunningEventCategory::class, 'running_event_category_id');
    }

    /** A team category that also runs a basketball tournament (pools, brackets, standings). */
    public function isTeamTournament(): bool
    {
        return $this->subject_type === self::SUBJECT_TEAM && $this->basketballCategory !== null;
    }

    /** An individual category whose confirmed registrants go onto a distance's start list. */
    public function isRaceEntry(): bool
    {
        return $this->subject_type === self::SUBJECT_INDIVIDUAL && $this->running_event_category_id !== null;
    }

    public function isFree(): bool
    {
        return $this->price === null || (float) $this->price === 0.0;
    }

    public function isOpen(): bool
    {
        if (! $this->registration_open || $this->eventBlocksRegistration()) {
            return false;
        }

        // A race closes entries for every one of its distances at once, so
        // the switch on the running event outranks this category's own.
        $this->loadMissing('runningCategory.runningEvent');

        if ($this->runningCategory?->runningEvent?->registration_open === false) {
            return false;
        }

        $now = now();

        if ($this->opens_at && $now->lt($this->opens_at)) {
            return false;
        }

        if ($this->closes_at && $now->gt($this->closes_at)) {
            return false;
        }

        return true;
    }

    /**
     * Nobody registers for an event that is over, whatever the category's
     * own switch says — unless the organiser turned on the event's after-end
     * override. Reads just the columns needed without pulling the whole
     * event onto this model, so public listings don't carry it into their JSON.
     */
    public function eventBlocksRegistration(): bool
    {
        $event = $this->relationLoaded('event')
            ? $this->event
            : $this->event()->select(['id', 'end_date', 'registration_after_end'])->first();

        return $event !== null && ! $event->acceptsRegistration();
    }

    public function hasAvailableQuota(): bool
    {
        return $this->quota === null || $this->registered_count < $this->quota;
    }

    /**
     * The shape every public page (landing, events index, event detail) renders
     * a category in: the price is always present, and `is_available` says
     * whether it can be bought right now rather than whether it gets listed.
     *
     * @return array<string, mixed>
     */
    public function toPublicArray(): array
    {
        $isOpen = $this->isOpen();
        $hasQuota = $this->hasAvailableQuota();

        return [
            ...$this->toArray(),
            'is_available' => $isOpen && $hasQuota,
            'unavailable_reason' => match (true) {
                $this->eventBlocksRegistration() => 'ended',
                ! $hasQuota => 'full',
                ! $isOpen => 'closed',
                default => null,
            },
            'slots_left' => $this->quota === null
                ? null
                : max($this->quota - $this->registered_count, 0),
        ];
    }

    /**
     * Field types that only show text on the form and never collect a value.
     * Mirrors DISPLAY_ONLY_FIELD_TYPES in resources/js/types/registration-category.ts.
     */
    public const DISPLAY_ONLY_TYPES = ['description'];

    /**
     * The roster block: collects a team's officials and players on the form
     * itself. Its answers become Player rows rather than form_data, so it is
     * neither a display block nor an ordinary input field.
     */
    public const ROSTER_TYPE = 'roster';

    /** Answer types an organiser may ask per roster member, beyond the fixed identity fields. */
    public const ROSTER_MEMBER_FIELD_TYPES = ['text', 'number', 'date', 'select', 'phone'];

    /**
     * A `file` field with this key on a team category is the team's logo: its
     * upload is copied onto teams.logo so ID cards and brackets show it.
     */
    public const TEAM_LOGO_KEY = 'team_logo';

    /** Crop/aspect presets a `file` field can ask for; mirrors IMAGE_RATIOS in the TS types. */
    public const IMAGE_RATIOS = ['portrait', 'square', 'landscape'];

    /**
     * A field type whose answer is machine-readable (`male`/`female`) rather
     * than whatever the organiser typed as options — what the bib sequence
     * and age-group results key on. Rendered with translated labels.
     */
    public const GENDER_TYPE = 'gender';

    /**
     * Well-known keys a race entry reads out of form_data: the runner's
     * gender (a `gender` field) and date of birth (a `date` field). The
     * default race form uses them; an organiser building their own form
     * keeps these keys for the start list to pick the answers up.
     */
    public const GENDER_KEY = 'gender';

    public const DOB_KEY = 'dob';

    /** Flattens fields across every page, display-only blocks included — the form's layout order. */
    public function allFields(): array
    {
        return collect($this->form_pages ?? [])
            ->flatMap(fn (array $page) => $page['fields'] ?? [])
            ->values()
            ->all();
    }

    /** Only the fields that carry a form_data answer — used by validation, CSV export, and table columns. */
    public function inputFields(): array
    {
        return collect($this->allFields())
            ->reject(fn (array $field) => in_array($field['type'] ?? null, [...self::DISPLAY_ONLY_TYPES, self::ROSTER_TYPE], true))
            ->values()
            ->all();
    }

    /**
     * The form's roster block, if the organiser placed one — with the player
     * slot's min/max taken from the tournament settings (see syncPlayerSlot()),
     * so the form validates and advertises the same limits the bracket enforces.
     */
    public function rosterField(): ?array
    {
        $field = collect($this->allFields())
            ->first(fn (array $field) => ($field['type'] ?? null) === self::ROSTER_TYPE);

        return $field === null ? null : $this->syncPlayerSlot($field);
    }

    /**
     * The form pages a registrant sees: the stored pages with the roster
     * block resolved through rosterField(), so the client never renders a
     * player slot the server would validate differently.
     *
     * @return array<int, array<string, mixed>>
     */
    public function formPagesForRegistrant(): array
    {
        return collect($this->form_pages ?? [])->map(fn (array $page) => [
            ...$page,
            'fields' => collect($page['fields'] ?? [])
                ->map(fn (array $field) => ($field['type'] ?? null) === self::ROSTER_TYPE ? $this->syncPlayerSlot($field) : $field)
                ->values()
                ->all(),
        ])->all();
    }

    /**
     * Min/Max players per team live on the tournament config — that is what
     * the bracket and the portal's player cap enforce. The roster block's
     * player slot is only a copy taken when the block was added, so it is
     * overwritten from the tournament on every read (and written through on
     * save by the builder). Without a tournament the slot stands on its own.
     *
     * @param  array<string, mixed>  $rosterField
     * @return array<string, mixed>
     */
    public function syncPlayerSlot(array $rosterField): array
    {
        $tournament = $this->basketballCategory;

        if ($tournament === null) {
            return $rosterField;
        }

        $rosterField['slots'] = collect($rosterField['slots'] ?? [])->map(function (array $slot) use ($tournament) {
            if (($slot['role'] ?? null) !== Player::ROLE_PLAYER) {
                return $slot;
            }

            return [
                ...$slot,
                'min' => (int) $tournament->min_player_per_team,
                'max' => $tournament->max_player_per_team === null ? null : (int) $tournament->max_player_per_team,
            ];
        })->values()->all();

        return $rosterField;
    }

    /**
     * The organiser-defined per-member questions from the roster block, or
     * none when the form has no block — what the portal and admin forms show
     * and validate as `extra`.
     *
     * @return array<int, array<string, mixed>>
     */
    public function rosterMemberFields(): array
    {
        return $this->rosterField()['member_fields'] ?? [];
    }

    /**
     * Whether the roster block asks for every member's photo, documents and
     * birth details on the form itself, or only name, role and jersey —
     * leaving the rest to the roster portal before the deadline (each member
     * gets a self-fill link), so a manager can register and pay before every
     * parent has sent the akta. Deferring is the default and the recommended
     * setup; an organiser opts into details-on-form explicitly.
     */
    public function rosterDetailsOnForm(): bool
    {
        return (bool) ($this->rosterField()['details_on_form'] ?? false);
    }

    /**
     * When roster edits close: the tournament's own deadline, else the moment
     * registration closes, else never. Mirrors BasketballEventCategory::rosterIsOpen().
     */
    public function rosterClosesAt(): ?CarbonInterface
    {
        return $this->basketballCategory?->roster_closes_at ?? $this->closes_at;
    }
}
