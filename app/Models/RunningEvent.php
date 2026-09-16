<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\MorphOne;

class RunningEvent extends Model
{
    use HasFactory;

    protected $fillable = [
        'registration_open',
        'results_published',
    ];

    protected $casts = [
        'registration_open' => 'boolean',
        'results_published' => 'boolean',
    ];

    // Mirrors the DB column defaults, so a freshly `create()`d instance (e.g. in
    // RunningEventController::store) reflects the right values in-memory too,
    // without needing a round trip back to the database.
    protected $attributes = [
        'registration_open' => true,
        'results_published' => false,
    ];

    /** @return HasMany<RunningEventCategory, $this> */
    public function categories(): HasMany
    {
        return $this->hasMany(RunningEventCategory::class);
    }

    /** @return MorphOne<Event, $this> */
    public function event(): MorphOne
    {
        return $this->morphOne(Event::class, 'specific');
    }
}
