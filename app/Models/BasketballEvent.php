<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\MorphOne;

class BasketballEvent extends Model
{
    protected $fillable = [
        'max_players_per_team',
        'pool_drawing_date',
    ];

    protected $casts = [
        'pool_drawing_date' => 'datetime',
    ];

    public function event(): MorphOne
    {
        return $this->morphOne(Event::class, 'specific');
    }
}
