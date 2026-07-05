<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Team extends Model
{
    protected $fillable = [
        'event_id', 'name', 'manager_name', 'manager_phone', 'logo', 'status',
    ];

    public function event(): BelongsTo
    {
        return $this->belongsTo(Event::class);
    }

    public function players(): HasMany
    {
        return $this->hasMany(Player::class);
    }

    public function pools(): BelongsToMany
    {
        return $this->belongsToMany(Pool::class);
    }
}
