<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;

/**
 * One distance of a running event — a 5K, a 10K, a half marathon. Runners
 * sign up through the linked registration category and appear here as
 * {@see RaceParticipant} rows once they hold a bib number.
 */
class RunningEventCategory extends Model
{
    use HasFactory;

    protected $fillable = [
        'running_event_id', 'registration_category_id', 'name', 'slug',
        'distance_meters', 'start_at', 'cutoff_minutes', 'bib_prefix',
        'bib_start_number', 'price', 'quota', 'status',
    ];

    protected $casts = [
        'distance_meters' => 'integer',
        'start_at' => 'datetime',
        'cutoff_minutes' => 'integer',
        'bib_start_number' => 'integer',
        'price' => 'decimal:2',
        'quota' => 'integer',
    ];

    protected $attributes = [
        'bib_start_number' => 1,
        'status' => 'active',
    ];

    protected static function boot(): void
    {
        parent::boot();

        static::creating(function (self $category) {
            if (empty($category->slug)) {
                $category->slug = Str::slug($category->name).'-'.Str::lower(Str::random(4));
            }
        });
    }

    /** @return BelongsTo<RunningEvent, $this> */
    public function runningEvent(): BelongsTo
    {
        return $this->belongsTo(RunningEvent::class);
    }

    /** @return BelongsTo<RegistrationCategory, $this> */
    public function registrationCategory(): BelongsTo
    {
        return $this->belongsTo(RegistrationCategory::class);
    }

    /** @return HasMany<RaceParticipant, $this> */
    public function participants(): HasMany
    {
        return $this->hasMany(RaceParticipant::class);
    }

    /** Distance in kilometres, the unit every pace and label is expressed in. */
    public function distanceKilometers(): float
    {
        return $this->distance_meters / 1000;
    }
}
