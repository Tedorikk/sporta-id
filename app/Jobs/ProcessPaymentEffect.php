<?php

namespace App\Jobs;

use App\Models\PaymentEffect;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class ProcessPaymentEffect implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 5;
    public int $timeout = 60;

    /**
     * Create a new job instance.
     */
    public function __construct(
        public PaymentEffect $effect
    ) {}

    /**
     * Execute the job.
     */
    public function handle(): void
    {
        // Check if already completed
        if ($this->effect->isCompleted()) {
            Log::info('[ProcessEffect] Effect already completed', [
                'effect_id' => $this->effect->id,
                'effect_type' => $this->effect->effect_type,
            ]);
            return;
        }

        // Mark as processing
        $this->effect->markProcessing();

        try {
            // Execute effect based on type
            match ($this->effect->effect_type) {
                'confirmation_email' => $this->sendConfirmationEmail(),
                'quota_update' => $this->updateQuota(),
                'bib_assignment' => $this->assignBib(),
                'vote_count' => $this->incrementVoteCount(),
                default => throw new \InvalidArgumentException(
                    "Unknown effect type: {$this->effect->effect_type}"
                ),
            };

            // Mark as completed
            $this->effect->markCompleted();

            Log::info('[ProcessEffect] Effect completed', [
                'effect_id' => $this->effect->id,
                'effect_type' => $this->effect->effect_type,
            ]);

        } catch (\Exception $e) {
            $this->effect->markFailed($e->getMessage());

            Log::error('[ProcessEffect] Effect processing failed', [
                'effect_id' => $this->effect->id,
                'effect_type' => $this->effect->effect_type,
                'attempt' => $this->effect->attempts,
                'error' => $e->getMessage(),
            ]);

            throw $e;
        }
    }

    /**
     * Send confirmation email to customer.
     */
    private function sendConfirmationEmail(): void
    {
        $payable = $this->effect->payable;

        if (!$payable) {
            throw new \RuntimeException('Payable not found for confirmation email');
        }

        // Check if already sent (idempotency)
        // The payable's handlePaymentSettled should be idempotent
        
        Log::info('[ProcessEffect] Sending confirmation email', [
            'effect_id' => $this->effect->id,
            'payable_type' => get_class($payable),
            'payable_id' => $payable->getKey(),
        ]);

        // Call payable's settlement handler
        $payable->handlePaymentSettled();
    }

    /**
     * Update quota/registration count.
     */
    private function updateQuota(): void
    {
        // Placeholder for quota update logic
        // This would decrement available slots or update registration counts
        
        Log::info('[ProcessEffect] Updating quota', [
            'effect_id' => $this->effect->id,
        ]);

        // TODO: Implement based on specific business logic
    }

    /**
     * Assign race bib number.
     */
    private function assignBib(): void
    {
        // Placeholder for bib assignment logic
        
        Log::info('[ProcessEffect] Assigning bib', [
            'effect_id' => $this->effect->id,
        ]);

        // TODO: Implement based on race registration logic
    }

    /**
     * Increment vote count for award nominee.
     */
    private function incrementVoteCount(): void
    {
        // Placeholder for vote count logic
        
        Log::info('[ProcessEffect] Incrementing vote count', [
            'effect_id' => $this->effect->id,
        ]);

        // TODO: Implement based on voting logic
    }

    /**
     * Calculate the number of seconds to wait before retrying the job.
     */
    public function backoff(): array
    {
        // Exponential backoff: 30s, 1m, 2m, 4m, 8m
        return [30, 60, 120, 240, 480];
    }

    /**
     * Handle a job failure.
     */
    public function failed(\Throwable $exception): void
    {
        $this->effect->markFailed($exception->getMessage());

        Log::error('[ProcessEffect] Effect permanently failed', [
            'effect_id' => $this->effect->id,
            'effect_type' => $this->effect->effect_type,
            'attempts' => $this->effect->attempts,
            'error' => $exception->getMessage(),
        ]);

        // Alert for manual intervention
        // TODO: Add alerting mechanism
    }
}
