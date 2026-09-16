<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\MorphTo;

/**
 * One candidate on an award's ballot, pointing at the player or team being
 * nominated.
 *
 * @property-read Player|Team|null $nominee
 */
class AwardNominee extends Model
{
    use HasFactory;

    protected $fillable = [
        'award_id', 'nominee_type', 'nominee_id', 'display_name', 'photo', 'sort_order',
    ];

    protected $casts = [
        'sort_order' => 'integer',
    ];

    protected $appends = ['name', 'photo_url'];

    /** @return BelongsTo<Award, $this> */
    public function award(): BelongsTo
    {
        return $this->belongsTo(Award::class);
    }

    /** @return MorphTo<Model, $this> */
    public function nominee(): MorphTo
    {
        return $this->morphTo();
    }

    /** @return HasMany<Vote, $this> */
    public function votes(): HasMany
    {
        return $this->hasMany(Vote::class);
    }

    /**
     * The ballot label: an organizer's override if they set one, otherwise the
     * nominated player's or team's own name.
     */
    public function getNameAttribute(): string
    {
        return $this->display_name ?: (string) ($this->nominee->name ?? 'Unknown nominee');
    }

    public function getPhotoUrlAttribute(): ?string
    {
        return $this->photo ?: $this->nominee?->getAttribute($this->nominee_type === Team::class ? 'logo' : 'photo');
    }
}
