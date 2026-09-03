<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;

class BasketballEventCategory extends Model
{
    use HasFactory;

    public const FORMAT_ROUND_ROBIN = 'round_robin';

    public const FORMAT_POOL_STAGE = 'pool_stage';

    /** Mirrors the `format` enum on basketball_event_categories. */
    public const FORMATS = [
        self::FORMAT_ROUND_ROBIN,
        self::FORMAT_POOL_STAGE,
    ];

    protected $fillable = [
        'basketball_event_id', 'registration_category_id', 'name', 'slug', 'format', 'win_points', 'loss_points',
        'min_team', 'max_team', 'min_player_per_team', 'max_player_per_team',
        'max_player_per_coach', 'price', 'quota', 'status',
    ];

    protected $casts = [
        'win_points' => 'integer',
        'loss_points' => 'integer',
        'min_team' => 'integer',
        'max_team' => 'integer',
        'min_player_per_team' => 'integer',
        'max_player_per_team' => 'integer',
        'max_player_per_coach' => 'integer',
        'price' => 'decimal:2',
        'quota' => 'integer',
        'status' => 'string',
    ];

    protected static function boot()
    {
        parent::boot();

        static::creating(function ($category) {
            if (empty($category->slug)) {
                $category->slug = Str::slug($category->name).'-'.Str::lower(Str::random(4));
            }
        });
    }

    /** @return BelongsTo<BasketballEvent, $this> */
    public function basketballEvent(): BelongsTo
    {
        return $this->belongsTo(BasketballEvent::class);
    }

    /** @return BelongsTo<RegistrationCategory, $this> */
    public function registrationCategory(): BelongsTo
    {
        return $this->belongsTo(RegistrationCategory::class);
    }

    /** @return HasMany<Team, $this> */
    public function teams(): HasMany
    {
        return $this->hasMany(Team::class);
    }

    /** @return HasMany<Pool, $this> */
    public function pools(): HasMany
    {
        return $this->hasMany(Pool::class);
    }

    /** @return HasMany<GameMatch, $this> */
    public function matches(): HasMany
    {
        return $this->hasMany(GameMatch::class);
    }

    public function isRoundRobin(): bool
    {
        return $this->format === self::FORMAT_ROUND_ROBIN;
    }
}
