<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class GameMatch extends Model
{
    protected $table = 'matches';

    protected $fillable = [
        'basketball_event_category_id', 'pool_id', 'round', 'match_number',
        'home_team_id', 'away_team_id',
        'home_source_match_id', 'away_source_match_id',
        'home_score', 'away_score', 'status', 'scheduled_at',
    ];

    protected $casts = [
        'scheduled_at' => 'datetime',
    ];

    /** @return BelongsTo<BasketballEventCategory, $this> */
    public function category(): BelongsTo
    {
        return $this->belongsTo(BasketballEventCategory::class, 'basketball_event_category_id');
    }

    /** @return BelongsTo<Pool, $this> */
    public function pool(): BelongsTo
    {
        return $this->belongsTo(Pool::class);
    }

    /** @return BelongsTo<Team, $this> */
    public function homeTeam(): BelongsTo
    {
        return $this->belongsTo(Team::class, 'home_team_id');
    }

    /** @return BelongsTo<Team, $this> */
    public function awayTeam(): BelongsTo
    {
        return $this->belongsTo(Team::class, 'away_team_id');
    }

    public function winnerTeamId(): ?int
    {
        if ($this->status !== 'finished' || $this->home_score === null) {
            return null;
        }

        return $this->home_score > $this->away_score ? $this->home_team_id : $this->away_team_id;
    }
}
