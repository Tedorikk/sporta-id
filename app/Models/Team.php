<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

// Removed HasMany import

class Team extends Model
{
    use HasFactory;

    protected $fillable = [
        'event_id', 'name', 'manager_name', 'manager_phone', 'logo', 'status', 'basketball_event_category_id',
    ];

    protected $casts = [
        'basketball_event_category_id' => 'integer',
    ];

    public function event(): BelongsTo
    {
        return $this->belongsTo(Event::class);
    }

    // Changed from HasMany to BelongsToMany
    public function players(): BelongsToMany
    {
        return $this->belongsToMany(Player::class);
    }

    public function pools(): BelongsToMany
    {
        return $this->belongsToMany(Pool::class);
    }

    public function basketballEventCategory(): BelongsTo
    {
        return $this->belongsTo(BasketballEventCategory::class, 'basketball_event_category_id', 'id');
    }
}
