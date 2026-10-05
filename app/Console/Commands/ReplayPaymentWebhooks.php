<?php

namespace App\Console\Commands;

use App\Jobs\ProcessPaymentWebhook;
use App\Models\PaymentWebhookReceipt;
use Illuminate\Console\Command;

class ReplayPaymentWebhooks extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'payments:replay-webhooks 
                            {--limit=100 : Maximum number of receipts to replay}
                            {--receipt= : Replay specific receipt ID}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Replay unprocessed webhook receipts';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $this->info('Starting webhook replay...');

        // Specific receipt replay
        if ($receiptId = $this->option('receipt')) {
            return $this->replayReceipt($receiptId);
        }

        // Find unprocessed or failed receipts
        $limit = (int) $this->option('limit');

        $receipts = PaymentWebhookReceipt::whereIn('processing_state', ['received', 'failed', 'unmatched'])
            ->where(function ($query) {
                $query->where('processing_attempts', '<', 5)
                    ->orWhere('processing_state', 'unmatched');
            })
            ->orderBy('received_at')
            ->limit($limit)
            ->get();

        if ($receipts->isEmpty()) {
            $this->info('No unprocessed receipts to replay.');

            return self::SUCCESS;
        }

        $this->info("Found {$receipts->count()} receipts to replay.");
        $progressBar = $this->output->createProgressBar($receipts->count());
        $progressBar->start();

        $stats = [
            'dispatched' => 0,
            'skipped' => 0,
        ];

        foreach ($receipts as $receipt) {
            if (! $receipt->canRetry()) {
                $stats['skipped']++;
                $progressBar->advance();

                continue;
            }

            // Reset to received state
            $receipt->update(['processing_state' => 'received']);

            // Dispatch processing job
            ProcessPaymentWebhook::dispatch($receipt)
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

        $this->info('Webhook replay complete.');

        return self::SUCCESS;
    }

    /**
     * Replay a specific receipt by ID.
     */
    private function replayReceipt(int $receiptId): int
    {
        $receipt = PaymentWebhookReceipt::find($receiptId);

        if (! $receipt) {
            $this->error("Receipt {$receiptId} not found.");

            return self::FAILURE;
        }

        if (! $receipt->canRetry()) {
            $this->warn("Receipt {$receiptId} cannot be retried (already processed or too many attempts).");

            return self::FAILURE;
        }

        // Reset to received state
        $receipt->update(['processing_state' => 'received']);

        // Dispatch processing job
        ProcessPaymentWebhook::dispatch($receipt)
            ->onQueue(config('payments.webhook_queue', 'payments'));

        $this->info("Receipt {$receiptId} dispatched for processing.");

        return self::SUCCESS;
    }
}
