<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\MorphOne;

class BasketballEvent extends Model
{
    protected $fillable = [
        'pool_drawing_date',
        'registration_open',
    ];

    protected $casts = [
        'pool_drawing_date' => 'datetime',
        'registration_open' => 'boolean',
    ];

    // Mirrors the DB column default, so a freshly `create()`d instance (e.g. in
    // BasketballEventController::store) reflects the right value in-memory too,
    // without needing a round trip back to the database.
    protected $attributes = [
        'registration_open' => true,
    ];

    public function categories()
    {
        return $this->hasMany(BasketballEventCategory::class);
    }

    public function event(): MorphOne
    {
        return $this->morphOne(Event::class, 'specific');
    }

    
}
