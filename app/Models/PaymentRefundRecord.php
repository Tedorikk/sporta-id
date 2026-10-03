<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PaymentRefundRecord extends Model
{
    use HasFactory;

    protected $fillable = [
        'payment_id',
        'registration_id',
        'amount',
        'currency',
        'provider',
        'provider_refund_id',
        'refund_state',
        'refunded_by',
        'refund_note',
        'refunded_at',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'refunded_at' => 'datetime',
    ];

    protected $attributes = [
        'refund_state' => 'recorded',
        'currency' => 'IDR',
    ];

    public function payment(): BelongsTo
    {
        return $this->belongsTo(Payment::class);
    }

    public function registration(): BelongsTo
    {
        return $this->belongsTo(Registration::class);
    }

    public function refundedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'refunded_by');
    }

    /**
     * Get total refunded amount for a payment.
     */
    public static function getTotalRefunded(int $paymentId): float
    {
        return static::where('payment_id', $paymentId)
            ->whereIn('refund_state', ['recorded', 'completed'])
            ->sum('amount');
    }

    /**
     * Check if payment can be refunded for given amount.
     */
    public static function canRefund(Payment $payment, float $amount): bool
    {
        $totalRefunded = static::getTotalRefunded($payment->id);
        $remaining = (float) $payment->amount - $totalRefunded;
        
        return $amount <= $remaining && $amount > 0;
    }
}
