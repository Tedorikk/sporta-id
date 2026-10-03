<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphTo;

class PaymentEffect extends Model
{
    use HasFactory;

    protected $fillable = [
        'payment_id',
        'payable_type',
        'payable_id',
        'effect_type',
        'effect_key',
        'payload',
        'state',
        'attempts',
        'error_message',
        'completed_at',
    ];

    protected $casts = [
        'payload' => 'array',
        'attempts' => 'integer',
        'completed_at' => 'datetime',
    ];

    protected $attributes = [
        'state' => 'pending',
        'attempts' => 0,
    ];

    public function payment(): BelongsTo
    {
        return $this->belongsTo(Payment::class);
    }

    /** @return MorphTo<Model, $this> */
    public function payable(): MorphTo
    {
        return $this->morphTo();
    }

    /**
     * Mark effect as being processed.
     */
    public function markProcessing(): void
    {
        $this->update([
            'state' => 'processing',
            'attempts' => $this->attempts + 1,
        ]);
    }

    /**
     * Mark effect as successfully completed.
     */
    public function markCompleted(): void
    {
        $this->update([
            'state' => 'completed',
            'completed_at' => now(),
            'error_message' => null,
        ]);
    }

    /**
     * Mark effect as failed with error.
     */
    public function markFailed(string $error): void
    {
        $this->update([
            'state' => 'failed',
            'error_message' => $error,
        ]);
    }

    /**
     * Check if effect can be retried.
     */
    public function canRetry(): bool
    {
        return in_array($this->state, ['pending', 'failed']) && $this->attempts < 5;
    }

    /**
     * Check if effect is already completed.
     */
    public function isCompleted(): bool
    {
        return $this->state === 'completed';
    }
}
