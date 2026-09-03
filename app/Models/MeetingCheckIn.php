<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MeetingCheckIn extends Model
{
    use HasFactory;

    public const STATUS_PRESENT = 'present';

    public const STATUS_ABSENT = 'absent';

    public const STATUSES = [
        self::STATUS_PRESENT,
        self::STATUS_ABSENT,
    ];

    public const METHOD_QR = 'qr';

    public const METHOD_MANUAL = 'manual';

    public const METHODS = [
        self::METHOD_QR,
        self::METHOD_MANUAL,
    ];

    protected $fillable = [
        'meeting_id', 'registration_id', 'status', 'method', 'checked_in_by', 'scanned_at',
    ];

    protected $casts = [
        'scanned_at' => 'datetime',
    ];

    /** @return BelongsTo<Meeting, $this> */
    public function meeting(): BelongsTo
    {
        return $this->belongsTo(Meeting::class);
    }

    /** @return BelongsTo<Registration, $this> */
    public function registration(): BelongsTo
    {
        return $this->belongsTo(Registration::class);
    }

    /** @return BelongsTo<User, $this> */
    public function checkedInBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'checked_in_by');
    }
}
