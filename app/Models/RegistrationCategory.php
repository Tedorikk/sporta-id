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
        'form_schema', 'status',
    ];

    protected $casts = [
        'price' => 'decimal:2',
        'quota' => 'integer',
        'registered_count' => 'integer',
        'registration_open' => 'boolean',
        'opens_at' => 'datetime',
        'closes_at' => 'datetime',
        'form_schema' => 'array',
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

    public function event(): BelongsTo
    {
        return $this->belongsTo(Event::class);
    }

    public function registrations(): HasMany
    {
        return $this->hasMany(Registration::class);
    }

    public function basketballCategory(): HasOne
    {
        return $this->hasOne(BasketballEventCategory::class);
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
}
