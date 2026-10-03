<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PaymentWebhookReceipt extends Model
{
    use HasFactory;

    protected $fillable = [
        'provider',
        'provider_account_id',
        'provider_mode',
        'event_type',
        'session_id',
        'reference_id',
        'payment_id',
        'dedupe_key',
        'payload_digest',
        'sanitized_payload',
        'processing_state',
        'processing_attempts',
        'processing_error',
        'received_at',
        'processed_at',
    ];

    protected $casts = [
        'sanitized_payload' => 'array',
        'processing_attempts' => 'integer',
        'received_at' => 'datetime',
        'processed_at' => 'datetime',
    ];

    protected $attributes = [
        'processing_state' => 'received',
        'processing_attempts' => 0,
    ];

    public function payment(): BelongsTo
    {
        return $this->belongsTo(Payment::class);
    }

    /**
     * Mark receipt as being processed.
     */
    public function markProcessing(): void
    {
        $this->update([
            'processing_state' => 'processing',
            'processing_attempts' => $this->processing_attempts + 1,
        ]);
    }

    /**
     * Mark receipt as successfully processed.
     */
    public function markProcessed(): void
    {
        $this->update([
            'processing_state' => 'processed',
            'processed_at' => now(),
            'processing_error' => null,
        ]);
    }

    /**
     * Mark receipt as failed with error.
     */
    public function markFailed(string $error): void
    {
        $this->update([
            'processing_state' => 'failed',
            'processing_error' => $error,
        ]);
    }

    /**
     * Mark receipt as unmatched (no payment found).
     */
    public function markUnmatched(string $reason): void
    {
        $this->update([
            'processing_state' => 'unmatched',
            'processing_error' => $reason,
        ]);
    }

    /**
     * Check if receipt can be retried.
     */
    public function canRetry(): bool
    {
        return in_array($this->processing_state, ['received', 'failed', 'unmatched'])
            && $this->processing_attempts < 5;
    }
}
