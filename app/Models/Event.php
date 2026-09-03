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
        $today = now()->startOfDay();

        if ($this->start_date->gt($today)) {
            return 'upcoming';
        }

        if ($this->end_date->lt($today)) {
            return 'past';
        }

        return 'ongoing';
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

    public function scopeStatus(Builder $query, ?string $status): Builder
    {
        return $query->when($status, function ($q) use ($status) {
            $today = now()->startOfDay();

            match ($status) {
                'published' => $q->where('is_published', true),
                'draft' => $q->where('is_published', false),
                'upcoming' => $q->where('start_date', '>', $today),
                'ongoing' => $q->where('start_date', '<=', $today)->where('end_date', '>=', $today),
                'past' => $q->where('end_date', '<', $today),
                default => null,
            };
        });
    }

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }

    // Relasi Polymorphic
    public function specific(): MorphTo
    {
        return $this->morphTo(__FUNCTION__, 'eventable_type', 'eventable_id');
    }

    // Relasi ke Modul Turnamen
    public function teams(): HasMany
    {
        return $this->hasMany(Team::class);
    }

    public function attendees(): HasMany
    {
        return $this->hasMany(Attendee::class);
    }

    public function attendeeTypes(): HasMany
    {
        return $this->hasMany(AttendeeType::class);
    }

    public function cardTemplates(): HasMany
    {
        return $this->hasMany(CardTemplate::class);
    }

    public function registrationCategories(): HasMany
    {
        return $this->hasMany(RegistrationCategory::class);
    }

    public function speakers(): HasMany
    {
        return $this->hasMany(Speaker::class);
    }

    public function meetings(): HasMany
    {
        return $this->hasMany(Meeting::class);
    }

    /**
     * Pools are scoped to BasketballEventCategory, not directly to Event.
     * Path: events → basketball_events → basketball_event_categories → pools
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
