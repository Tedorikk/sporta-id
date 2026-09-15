<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Team extends Model
{
    use HasFactory;

    protected $fillable = [
        'event_id', 'name', 'logo', 'status', 'basketball_event_category_id',
    ];

    protected $casts = [
        'basketball_event_category_id' => 'integer',
    ];

    /** @return BelongsTo<Event, $this> */
    public function event(): BelongsTo
    {
        return $this->belongsTo(Event::class);
    }

    // Changed from HasMany to BelongsToMany
    /** @return BelongsToMany<Player, $this> */
    public function players(): BelongsToMany
    {
        return $this->belongsToMany(Player::class);
    }

    /** @return BelongsToMany<Pool, $this> */
    public function pools(): BelongsToMany
    {
        return $this->belongsToMany(Pool::class);
    }

    /** @return BelongsTo<BasketballEventCategory, $this> */
    public function basketballEventCategory(): BelongsTo
    {
        return $this->belongsTo(BasketballEventCategory::class, 'basketball_event_category_id', 'id');
    }

    /**
     * The registration that entered this team: payment state, form answers,
     * and the captain's portal token.
     *
     * @return HasOne<Registration, $this>
     */
    public function registration(): HasOne
    {
        return $this->hasOne(Registration::class);
    }

    /**
     * Roster edits stop once the organiser has verified the team (the sheet
     * they reviewed must stay what they reviewed) or the category's roster
     * window has closed.
     */
    public function rosterLocked(): bool
    {
        if ($this->status === 'verified') {
            return true;
        }

        return ! ($this->basketballEventCategory?->rosterIsOpen() ?? true);
    }

    /** @return HasMany<GameMatch, $this> */
    public function homeMatches(): HasMany
    {
        return $this->hasMany(GameMatch::class, 'home_team_id');
    }

    /** @return HasMany<GameMatch, $this> */
    public function awayMatches(): HasMany
    {
        return $this->hasMany(GameMatch::class, 'away_team_id');
    }

    /**
     * The team's earliest not-yet-finished match scheduled for today, or null
     * if there are no more matches today.
     */
    public function nextMatchToday(): ?GameMatch
    {
        $today = now()->startOfDay();
        $tomorrow = $today->copy()->addDay();

        return GameMatch::query()
            ->where(function ($query) {
                $query->where('home_team_id', $this->id)
                    ->orWhere('away_team_id', $this->id);
            })
            ->whereBetween('scheduled_at', [$today, $tomorrow])
            ->where('status', '!=', 'finished')
            ->with(['homeTeam', 'awayTeam', 'category'])
            ->orderBy('scheduled_at')
            ->first();
    }
}
