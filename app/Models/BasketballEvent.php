<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\MorphOne;

class BasketballEvent extends Model
{
    use HasFactory;

    protected $fillable = [
        'pool_drawing_date',
    ];

    protected $casts = [
        'pool_drawing_date' => 'datetime',
    ];

    /** @return HasMany<BasketballEventCategory, $this> */
    public function categories(): HasMany
    {
        return $this->hasMany(BasketballEventCategory::class);
    }

    public function event(): MorphOne
    {
        return $this->morphOne(Event::class, 'specific');
    }
}
