<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;

class Player extends Model
{
    protected $fillable = [
        'team_id', 'name', 'jersey_number', 'position',
        'photo', 'phone_number', 'email', 'dob', 'qr_token',
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

    public function team(): BelongsTo
    {
        return $this->belongsTo(Team::class);
    }
}