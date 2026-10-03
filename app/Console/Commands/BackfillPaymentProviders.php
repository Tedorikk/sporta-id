<?php

namespace App\Console\Commands;

use App\Models\Payment;
use Illuminate\Console\Command;

class BackfillPaymentProviders extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'payments:backfill-providers 
                            {--dry-run : Show what would be changed without applying}
                            {--chunk=100 : Number of records to process per chunk}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Backfill provider field for historical payments';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $dryRun = $this->option('dry-run');
        $chunkSize = (int) $this->option('chunk');

        $this->info('Starting payment provider backfill...');
        if ($dryRun) {
            $this->warn('DRY RUN MODE - No changes will be saved');
        }

        $stats = [
            'total' => 0,
            Payment::PROVIDER_MIDTRANS => 0,
            Payment::PROVIDER_MANUAL => 0,
            'ambiguous' => 0,
            'already_set' => 0,
        ];

        // Get total count
        $totalPayments = Payment::whereNull('provider')->count();
        $this->info("Found {$totalPayments} payments without provider set");

        if ($totalPayments === 0) {
            $this->info('No payments need backfilling.');

            return self::SUCCESS;
        }

        $progressBar = $this->output->createProgressBar($totalPayments);
        $progressBar->start();

        $ambiguous = [];

        Payment::whereNull('provider')
            ->chunkById($chunkSize, function ($payments) use ($dryRun, &$stats, &$ambiguous, $progressBar) {
                foreach ($payments as $payment) {
                    $stats['total']++;

                    $provider = $this->determineProvider($payment);

                    if ($provider === 'ambiguous') {
                        $stats['ambiguous']++;
                        $ambiguous[] = [
                            'id' => $payment->id,
                            'order_id' => $payment->order_id,
                            'status' => $payment->status,
                            'amount' => $payment->amount,
                            'has_snap_token' => ! empty($payment->snap_token),
                            'has_transaction_id' => ! empty($payment->midtrans_transaction_id),
                            'has_proof' => ! empty($payment->proof_path),
                            'verified_by' => $payment->verified_by,
                            'created_at' => $payment->created_at,
                        ];
                    } else {
                        $stats[$provider]++;

                        if (! $dryRun) {
                            $this->backfillPayment($payment, $provider);
                        }
                    }

                    $progressBar->advance();
                }
            });

        $progressBar->finish();
        $this->newLine(2);

        // Display results
        $this->info('Backfill Summary:');
        $this->table(
            ['Category', 'Count'],
            [
                ['Total processed', $stats['total']],
                ['Midtrans', $stats[Payment::PROVIDER_MIDTRANS]],
                ['Manual transfer', $stats[Payment::PROVIDER_MANUAL]],
                ['Ambiguous (needs review)', $stats['ambiguous']],
            ]
        );

        // Show ambiguous payments
        if (! empty($ambiguous)) {
            $this->newLine();
            $this->warn('Ambiguous payments requiring manual review:');
            $this->table(
                ['ID', 'Order ID', 'Status', 'Amount', 'Has Snap', 'Has TX ID', 'Has Proof', 'Verified By', 'Created'],
                array_map(fn ($p) => [
                    $p['id'],
                    $p['order_id'],
                    $p['status'],
                    $p['amount'],
                    $p['has_snap_token'] ? 'Yes' : 'No',
                    $p['has_transaction_id'] ? 'Yes' : 'No',
                    $p['has_proof'] ? 'Yes' : 'No',
                    $p['verified_by'] ?? 'N/A',
                    $p['created_at'],
                ], $ambiguous)
            );
        }

        if ($dryRun) {
            $this->newLine();
            $this->info('Dry run complete. Run without --dry-run to apply changes.');
        } else {
            $this->info('Backfill complete!');
        }

        return self::SUCCESS;
    }

    /**
     * Determine the provider for a payment based on available evidence.
     */
    private function determineProvider(Payment $payment): string
    {
        $hasSnapToken = ! empty($payment->snap_token);
        $hasMidtransId = ! empty($payment->midtrans_transaction_id);
        $hasProof = ! empty($payment->proof_path);
        $isVerified = ! empty($payment->verified_by);

        // Clear Midtrans: has Snap token or Midtrans transaction ID
        if ($hasSnapToken || $hasMidtransId) {
            return Payment::PROVIDER_MIDTRANS;
        }

        // Clear manual transfer: has proof upload and manual verification
        if ($hasProof && $isVerified) {
            return Payment::PROVIDER_MANUAL;
        }

        // Manual transfer without proof: verified but no online payment evidence
        if ($isVerified && ! $hasSnapToken && ! $hasMidtransId) {
            return Payment::PROVIDER_MANUAL;
        }

        // Pending payment with no evidence - could be failed Midtrans creation or manual
        if ($payment->status === Payment::STATUS_PENDING) {
            // If very old and never had Snap token, likely failed creation
            // But without definitive proof, mark as ambiguous for review
            return 'ambiguous';
        }

        // Expired/canceled with no Snap token - could be either
        if (in_array($payment->status, [Payment::STATUS_EXPIRE, Payment::STATUS_CANCEL])) {
            return 'ambiguous';
        }

        // Settled but no clear provider evidence - unusual, needs review
        if ($payment->status === Payment::STATUS_SETTLEMENT) {
            return 'ambiguous';
        }

        // Default to ambiguous for manual review
        return 'ambiguous';
    }

    /**
     * Backfill a payment record with provider and related metadata.
     */
    private function backfillPayment(Payment $payment, string $provider): void
    {
        $updates = [
            'provider' => $provider,
            'currency' => 'IDR',
        ];

        // Copy Midtrans transaction ID to provider_payment_id for historical reference
        if ($provider === Payment::PROVIDER_MIDTRANS && $payment->midtrans_transaction_id) {
            $updates['provider_payment_id'] = $payment->midtrans_transaction_id;

            // Determine mode from config or assume production for old payments
            $updates['provider_mode'] = config('services.midtrans.is_production') ? 'live' : 'test';
        }

        // Set checkout state for historical records
        if ($provider === Payment::PROVIDER_MANUAL) {
            $updates['checkout_state'] = Payment::CHECKOUT_CLOSED;
        } elseif ($payment->status === Payment::STATUS_SETTLEMENT) {
            $updates['checkout_state'] = Payment::CHECKOUT_CLOSED;
            $updates['fulfillment_state'] = Payment::FULFILLMENT_FULFILLED;
        } elseif (in_array($payment->status, [Payment::STATUS_EXPIRE, Payment::STATUS_CANCEL], true)) {
            $updates['checkout_state'] = Payment::CHECKOUT_CLOSED;
        }

        // Update last reconciled for settled payments
        if ($payment->status === Payment::STATUS_SETTLEMENT && $payment->paid_at) {
            $updates['last_reconciled_at'] = $payment->paid_at;
            $updates['provider_updated_at'] = $payment->paid_at;
        }

        $payment->update($updates);
    }
}
