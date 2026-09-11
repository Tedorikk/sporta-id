<?php

namespace App\Models;

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
        'event_id', 'name', 'slug', 'subject_type', 'price', 'quota',
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

    /** @return HasOne<RunningEventCategory, $this> */
    public function runningCategory(): HasOne
    {
        return $this->hasOne(RunningEventCategory::class);
    }

    public function isFree(): bool
    {
        return $this->price === null || (float) $this->price === 0.0;
    }

    public function isOpen(): bool
    {
        if (! $this->registration_open) {
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

    /** Flattens fields across every page, display-only blocks included — the form's layout order. */
    public function allFields(): array
    {
        return collect($this->form_pages ?? [])
            ->flatMap(fn (array $page) => $page['fields'] ?? [])
            ->values()
            ->all();
    }

    /** Only the fields that carry an answer — used by validation, CSV export, and table columns. */
    public function inputFields(): array
    {
        return collect($this->allFields())
            ->reject(fn (array $field) => in_array($field['type'] ?? null, self::DISPLAY_ONLY_TYPES, true))
            ->values()
            ->all();
    }
}
