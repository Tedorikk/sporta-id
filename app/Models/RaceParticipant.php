<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * A runner on one distance's start list, carrying both their bib number and
 * their result. One runner has exactly one result, so the two live on the
 * same row rather than in a separate results table.
 */
class RaceParticipant extends Model
{
    use HasFactory;

    public const STATUS_REGISTERED = 'registered';

    public const STATUS_FINISHED = 'finished';

    /** Started but did not finish. */
    public const STATUS_DNF = 'dnf';

    /** On the start list but never started. */
    public const STATUS_DNS = 'dns';

    public const STATUS_DISQUALIFIED = 'dq';

    public const STATUSES = [
        self::STATUS_REGISTERED,
        self::STATUS_FINISHED,
        self::STATUS_DNF,
        self::STATUS_DNS,
        self::STATUS_DISQUALIFIED,
    ];

    protected $fillable = [
        'running_event_category_id', 'registration_id', 'bib_number', 'name',
        'email', 'phone', 'gender', 'dob', 'started_at', 'finished_at',
        'duration_seconds', 'status',
    ];

    protected $casts = [
        'dob' => 'date:Y-m-d',
        'started_at' => 'datetime',
        'finished_at' => 'datetime',
        'duration_seconds' => 'integer',
    ];

    protected $attributes = [
        'status' => self::STATUS_REGISTERED,
    ];

    /** @return BelongsTo<RunningEventCategory, $this> */
    public function category(): BelongsTo
    {
        return $this->belongsTo(RunningEventCategory::class, 'running_event_category_id');
    }

    /** @return BelongsTo<Registration, $this> */
    public function registration(): BelongsTo
    {
        return $this->belongsTo(Registration::class);
    }

    /**
     * Runners with a time to rank. Everyone else — DNF, DNS, disqualified, or
     * simply still out on course — is listed unranked.
     *
     * @param  Builder<RaceParticipant>  $query
     * @return Builder<RaceParticipant>
     */
    public function scopeFinishers(Builder $query): Builder
    {
        return $query->where('status', self::STATUS_FINISHED)->whereNotNull('duration_seconds');
    }

    public function isFinisher(): bool
    {
        return $this->status === self::STATUS_FINISHED && $this->duration_seconds !== null;
    }
}
