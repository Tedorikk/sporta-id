<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class BasketballEventCategory extends Model
{
    use HasFactory;

    protected $fillable = [
        'basketball_event_id',
        'name',
        'slug',
        'min_team',
        'max_team',
        'min_player_per_team',
        'max_player_per_team',
        'max_player_per_coach',
        'price',
        'quota',
        'status',
    ];

    protected $casts = [
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

    public function basketballEvent(): BelongsTo
    {
        return $this->belongsTo(BasketballEvent::class);
    }
}
