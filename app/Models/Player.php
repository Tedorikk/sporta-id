<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany; // Added
use Illuminate\Support\Str;

class Player extends Model
{
    protected $fillable = [
        // Removed 'team_id'
        'name', 'jersey_number', 'position',
        'photo', 'phone_number', 'email', 'dob', 'qr_token', 'basketball_club_id',
    ];

    protected $casts = [
        'dob' => 'date:Y-m-d',
    ];

    protected static function boot()
    {
        parent::boot();
        static::creating(function ($player) {
            if (empty($player->qr_token)) {
                $player->qr_token = (string) Str::uuid();
            }
        });
    }

    // Changed from team() to teams() and updated relation
    public function teams(): BelongsToMany
    {
        return $this->belongsToMany(Team::class);
    }

    public function basketballClub(): BelongsTo
    {
        return $this->belongsTo(BasketballClub::class);
    }
}