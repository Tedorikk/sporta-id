<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Pool extends Model
{
    protected $fillable = ['basketball_event_category_id', 'name'];

    /** @return BelongsTo<BasketballEventCategory, $this> */
    public function category(): BelongsTo
    {
        return $this->belongsTo(BasketballEventCategory::class, 'basketball_event_category_id');
    }

    /** @return BelongsToMany<Team, $this> */
    public function teams(): BelongsToMany
    {
        return $this->belongsToMany(Team::class);
    }

    /** @return HasMany<GameMatch, $this> */
    public function matches(): HasMany
    {
        return $this->hasMany(GameMatch::class);
    }
}
