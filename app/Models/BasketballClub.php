<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class BasketballClub extends Model
{
    protected $fillable = [
        'name',
    ];

    /** @return HasMany<Player, $this> */
    public function player(): HasMany
    {
        return $this->hasMany(Player::class);
    }
}
