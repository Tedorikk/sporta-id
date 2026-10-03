<?php

namespace App\Console\Commands;

use App\Jobs\ProcessPaymentEffect;
use App\Models\PaymentEffect;
use Illuminate\Console\Command;

class DispatchPendingPaymentEffects extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'payments:dispatch-effects 
                            {--effect= : Dispatch specific effect ID}
                            {--type= : Only dispatch specific effect type}
                            {--limit=100 : Maximum number of effects to dispatch}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Dispatch pending payment effects for processing';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $this->info('Starting effect dispatch...');

        // Specific effect dispatch
        if ($effectId = $this->option('effect')) {
            return $this->dispatchEffect($effectId);
        }

        // Find pending or failed effects
        $query = PaymentEffect::whereIn('state', ['pending', 'failed'])
            ->where('attempts', '<', 5);

        if ($type = $this->option('type')) {
            $query->where('effect_type', $type);
        }

        $limit = (int) $this->option('limit');
        $effects = $query->orderBy('created_at')->limit($limit)->get();

        if ($effects->isEmpty()) {
            $this->info('No pending effects to dispatch.');
            return self::SUCCESS;
        }

        $this->info("Found {$effects->count()} effects to dispatch.");
        $progressBar = $this->output->createProgressBar($effects->count());
        $progressBar->start();

        $stats = [
            'dispatched' => 0,
            'skipped' => 0,
        ];

        foreach ($effects as $effect) {
            if (!$effect->canRetry()) {
                $stats['skipped']++;
                $progressBar->advance();
                continue;
            }

            // Reset to pending state if failed
            if ($effect->state === 'failed') {
                $effect->update(['state' => 'pending']);
            }

            // Dispatch processing job
            ProcessPaymentEffect::dispatch($effect)
                ->onQueue(config('payments.webhook_queue', 'payments'));

            $stats['dispatched']++;
            $progressBar->advance();
        }

        $progressBar->finish();
        $this->newLine(2);

        $this->table(
            ['Result', 'Count'],
            [
                ['Dispatched', $stats['dispatched']],
                ['Skipped', $stats['skipped']],
            ]
        );

        $this->info('Effect dispatch complete.');

        return self::SUCCESS;
    }

    /**
     * Dispatch a specific effect by ID.
     */
    private function dispatchEffect(int $effectId): int
    {
        $effect = PaymentEffect::find($effectId);

        if (!$effect) {
            $this->error("Effect {$effectId} not found.");
            return self::FAILURE;
        }

        if ($effect->isCompleted()) {
            $this->warn("Effect {$effectId} is already completed.");
            return self::FAILURE;
        }

        if (!$effect->canRetry()) {
            $this->warn("Effect {$effectId} cannot be retried (too many attempts).");
            return self::FAILURE;
        }

        // Reset to pending if failed
        if ($effect->state === 'failed') {
            $effect->update(['state' => 'pending']);
        }

        // Dispatch processing job
        ProcessPaymentEffect::dispatch($effect)
            ->onQueue(config('payments.webhook_queue', 'payments'));

        $this->info("Effect {$effectId} dispatched for processing.");

        return self::SUCCESS;
    }
}
