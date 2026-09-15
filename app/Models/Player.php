<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany; // Added
use Illuminate\Support\Str;

class Player extends Model
{
    public const ROLE_PLAYER = 'player';

    public const ROLE_COACH = 'coach';

    public const ROLE_ASSISTANT_COACH = 'assistant_coach';

    public const ROLE_MANAGER = 'manager';

    public const ROLE_MEDIC = 'medic';

    public const ROLE_OFFICER = 'officer';

    public const ROLES = [
        self::ROLE_PLAYER,
        self::ROLE_COACH,
        self::ROLE_ASSISTANT_COACH,
        self::ROLE_MANAGER,
        self::ROLE_MEDIC,
        self::ROLE_OFFICER,
    ];

    protected $fillable = [
        // Removed 'team_id'
        'name', 'role', 'jersey_number', 'position',
        'photo', 'certificate', 'is_certificate_validated', 'phone_number', 'email', 'dob',
        'birthplace', 'identity_card', 'qr_token', 'basketball_club_id',
    ];

    protected $casts = [
        'dob' => 'date:Y-m-d',
        'is_certificate_validated' => 'boolean',
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
    /** @return BelongsToMany<Team, $this> */
    public function teams(): BelongsToMany
    {
        return $this->belongsToMany(Team::class);
    }

    /** @return BelongsTo<BasketballClub, $this> */
    public function basketballClub(): BelongsTo
    {
        return $this->belongsTo(BasketballClub::class);
    }
}
