<?php

namespace App\Models;

use App\Concerns\HasVerificationCode;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;

class Attendee extends Model
{
    use HasVerificationCode;

    public const STATUS_ACTIVE = 'active';

    public const STATUS_REVOKED = 'revoked';

    public const STATUSES = [
        self::STATUS_ACTIVE,
        self::STATUS_REVOKED,
    ];

    protected $fillable = [
        'event_id', 'attendee_type_id', 'name', 'photo', 'organization',
        'title', 'email', 'phone', 'qr_token', 'verification_code', 'status', 'notes',
    ];

    protected static function boot()
    {
        parent::boot();
        static::creating(function ($attendee) {
            if (empty($attendee->qr_token)) {
                $attendee->qr_token = (string) Str::uuid();
            }
            if (empty($attendee->verification_code)) {
                $attendee->verification_code = self::generateVerificationCode();
            }
            if (empty($attendee->status)) {
                $attendee->status = self::STATUS_ACTIVE;
            }
        });
    }

    /** @return BelongsTo<Event, $this> */
    public function event(): BelongsTo
    {
        return $this->belongsTo(Event::class);
    }

    /** @return BelongsTo<AttendeeType, $this> */
    public function attendeeType(): BelongsTo
    {
        return $this->belongsTo(AttendeeType::class);
    }
}
