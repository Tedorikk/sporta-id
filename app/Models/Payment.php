<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphTo;

class Payment extends Model
{
    use HasFactory;

    public const STATUS_PENDING = 'pending';

    public const STATUS_SETTLEMENT = 'settlement';

    public const STATUS_EXPIRE = 'expire';

    public const STATUS_CANCEL = 'cancel';

    public const STATUS_DENY = 'deny';

    public const STATUS_FAILURE = 'failure';

    public const STATUS_REFUND = 'refund';

    public const STATUSES = [
        self::STATUS_PENDING,
        self::STATUS_SETTLEMENT,
        self::STATUS_EXPIRE,
        self::STATUS_CANCEL,
        self::STATUS_DENY,
        self::STATUS_FAILURE,
        self::STATUS_REFUND,
    ];

    protected $fillable = [
        'payable_type', 'payable_id', 'order_id', 'amount', 'status', 'midtrans_transaction_id',
        'payment_type', 'snap_token', 'raw_notification', 'paid_at',
        'proof_path', 'verified_by', 'verified_at',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'raw_notification' => 'array',
        'paid_at' => 'datetime',
        'verified_at' => 'datetime',
    ];

    protected $attributes = [
        'status' => self::STATUS_PENDING,
    ];

    /**
     * What was paid for — a Registration, or a batch of votes on a paid award.
     *
     * @return MorphTo<Model, $this>
     */
    public function payable(): MorphTo
    {
        return $this->morphTo();
    }

    /** Who approved or rejected a manual-transfer payment, if any. */
    public function verifier(): BelongsTo
    {
        return $this->belongsTo(User::class, 'verified_by');
    }
}
