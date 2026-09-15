<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasManyThrough;
use Illuminate\Database\Eloquent\Relations\MorphTo;

class Event extends Model
{
    use HasFactory;

    protected $table = 'events';

    protected $primaryKey = 'id';

    protected $fillable = [
        'organization_id',
        'name',
        'description',
        'contact_person',
        'category',
        'is_published',
        'registration_after_end',
        'start_date',
        'end_date',
        'banner',
        'logo',
        'accent_color',
        'instagram_url',
        'facebook_url',
        'youtube_url',
        'whatsapp_url',
    ];

    protected $casts = [
        'is_published' => 'boolean',
        'registration_after_end' => 'boolean',
        'start_date' => 'date:Y-m-d',
        'end_date' => 'date:Y-m-d',
    ];

    protected $appends = ['status'];

    protected static function boot(): void
    {
        parent::boot();

        static::created(function (Event $event) {
            AttendeeType::seedDefaultsFor($event);
        });
    }

    public function getStatusAttribute(): string
    {
        if ($this->start_date->gt(now()->startOfDay())) {
            return 'upcoming';
        }

        return $this->hasEnded() ? 'past' : 'ongoing';
    }

    /** True from the day after the event's last day. */
    public function hasEnded(): bool
    {
        return $this->end_date->lt(now()->startOfDay());
    }

    /**
     * Whether categories on this event may still take registrations as far
     * as the calendar is concerned: an event that is over stops, unless the
     * organiser has switched on the after-end override.
     */
    public function acceptsRegistration(): bool
    {
        return ! $this->hasEnded() || $this->registration_after_end;
    }

    public function scopeForOrganization(Builder $query, Organization|int|null $organization): Builder
    {
        $organizationId = $organization instanceof Organization ? $organization->id : $organization;

        // A null organization must match nothing rather than everything.
        return $query->where('organization_id', $organizationId);
    }

    public function scopeSearch(Builder $query, ?string $term): Builder
    {
        return $query->when($term, fn ($q) => $q->where(fn ($q2) => $q2
            ->where('name', 'like', "%{$term}%")
            ->orWhere('description', 'like', "%{$term}%")
        ));
    }

    public function scopeCategory(Builder $query, ?string $category): Builder
    {
        return $query->when($category, fn ($q) => $q->where('category', $category));
    }

    /**
     * Publication state. Deliberately separate from {@see scopeTiming()}: an event
     * can be a draft that starts next week, so the two must stay combinable.
     */
    public function scopeLifecycle(Builder $query, ?string $lifecycle): Builder
    {
        return $query->when($lifecycle, fn ($q) => match ($lifecycle) {
            'published' => $q->where('is_published', true),
            'draft' => $q->where('is_published', false),
            default => $q,
        });
    }

    /**
     * Where the event sits relative to today. Orthogonal to {@see scopeLifecycle()}.
     */
    public function scopeTiming(Builder $query, ?string $timing): Builder
    {
        return $query->when($timing, function ($q) use ($timing) {
            $today = now()->startOfDay();

            return match ($timing) {
                'upcoming' => $q->where('start_date', '>', $today),
                'ongoing' => $q->where('start_date', '<=', $today)->where('end_date', '>=', $today),
                'past' => $q->where('end_date', '<', $today),
                default => $q,
            };
        });
    }

    /** @return BelongsTo<Organization, $this> */
    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }

    // Relasi Polymorphic
    /** @return MorphTo<Model, $this> */
    public function specific(): MorphTo
    {
        return $this->morphTo(__FUNCTION__, 'eventable_type', 'eventable_id');
    }

    // Relasi ke Modul Turnamen
    /** @return HasMany<Team, $this> */
    public function teams(): HasMany
    {
        return $this->hasMany(Team::class);
    }

    /** @return HasMany<Attendee, $this> */
    public function attendees(): HasMany
    {
        return $this->hasMany(Attendee::class);
    }

    /** @return HasMany<AttendeeType, $this> */
    public function attendeeTypes(): HasMany
    {
        return $this->hasMany(AttendeeType::class);
    }

    /** @return HasMany<CardTemplate, $this> */
    public function cardTemplates(): HasMany
    {
        return $this->hasMany(CardTemplate::class);
    }

    /** @return HasMany<RegistrationCategory, $this> */
    public function registrationCategories(): HasMany
    {
        return $this->hasMany(RegistrationCategory::class);
    }

    /** @return HasMany<Speaker, $this> */
    public function speakers(): HasMany
    {
        return $this->hasMany(Speaker::class);
    }

    /** @return HasMany<Meeting, $this> */
    public function meetings(): HasMany
    {
        return $this->hasMany(Meeting::class);
    }

    /** @return HasMany<Award, $this> */
    public function awards(): HasMany
    {
        return $this->hasMany(Award::class);
    }

    /**
     * Pools are scoped to BasketballEventCategory, not directly to Event.
     * Path: events → basketball_events → basketball_event_categories → pools
     *
     * @return HasManyThrough<Pool, BasketballEventCategory, $this>
     */
    public function pools(): HasManyThrough
    {
        return $this->hasManyThrough(
            Pool::class,
            BasketballEventCategory::class,
            'basketball_event_id', // FK on basketball_event_categories → basketball_events
            'basketball_event_category_id', // FK on pools → basketball_event_categories
            'eventable_id',         // local key on events (points to basketball_events.id)
            'id'                    // local key on basketball_event_categories
        );
    }

    /**
     * Matches are also scoped to BasketballEventCategory.
     * Path: events → basketball_events → basketball_event_categories → matches
     *
     * @return HasManyThrough<GameMatch, BasketballEventCategory, $this>
     */
    public function matches(): HasManyThrough
    {
        return $this->hasManyThrough(
            GameMatch::class,
            BasketballEventCategory::class,
            'basketball_event_id',
            'basketball_event_category_id',
            'eventable_id',
            'id'
        );
    }
}
