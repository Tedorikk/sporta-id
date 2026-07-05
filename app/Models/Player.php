<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;

class Player extends Model
{
    protected $fillable = [
        'team_id', 'name', 'jersey_number', 'position', 'qr_token'
    ];

    // Generate UUID otomatis saat Player dibuat
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
