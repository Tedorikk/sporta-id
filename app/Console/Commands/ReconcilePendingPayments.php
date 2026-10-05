<?php

namespace App\Console\Commands;

use App\Models\Payment;
use App\Services\Payments\PaymentGatewayManager;
use App\Services\Payments\PaymentReconciler;
use Illuminate\Console\Command;

class ReconcilePendingPayments extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'payments:reconcile-pending 
                            {--provider= : Only reconcile specific provider (midtrans, xendit)}
                            {--payment= : Reconcile specific payment ID}
                            {--order= : Reconcile specific order ID}
                            {--limit=100 : Maximum number of payments to reconcile}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Reconcile pending payments by retrieving current status from providers';

    /**
     * Execute the console command.
     */
    public function handle(
        PaymentGatewayManager $gatewayManager,
        PaymentReconciler $reconciler
    ): int {
        $this->info('Starting payment reconciliation...');

        // Specific payment reconciliation
        if ($paymentId = $this->option('payment')) {
            return $this->reconcilePayment($paymentId, $gatewayManager, $reconciler);
        }

        if ($orderId = $this->option('order')) {
            return $this->reconcileOrder($orderId, $gatewayManager, $reconciler);
        }

        // Batch reconciliation
        $query = Payment::needsReconciliation();

        if ($provider = $this->option('provider')) {
            $query->byProvider($provider);
        }

        $limit = (int) $this->option('limit');
        $payments = $query->limit($limit)->get();

        if ($payments->isEmpty()) {
            $this->info('No pending payments to reconcile.');

            return self::SUCCESS;
        }

        $this->info("Found {$payments->count()} payments to reconcile.");
        $progressBar = $this->output->createProgressBar($payments->count());
        $progressBar->start();

        $stats = [
            'success' => 0,
            'failed' => 0,
            'skipped' => 0,
        ];

        foreach ($payments as $payment) {
            try {
                $this->reconcileSingle($payment, $gatewayManager, $reconciler);
                $stats['success']++;
            } catch (\Exception $e) {
                $stats['failed']++;
                $this->error("\nFailed to reconcile payment {$payment->order_id}: {$e->getMessage()}");
            }

            $progressBar->advance();
        }

        $progressBar->finish();
        $this->newLine(2);

        // Display results
        $this->table(
            ['Result', 'Count'],
            [
                ['Success', $stats['success']],
                ['Failed', $stats['failed']],
                ['Skipped', $stats['skipped']],
            ]
        );

        return $stats['failed'] > 0 ? self::FAILURE : self::SUCCESS;
    }

    /**
     * Reconcile a specific payment by ID.
     */
    private function reconcilePayment(
        int $paymentId,
        PaymentGatewayManager $gatewayManager,
        PaymentReconciler $reconciler
    ): int {
        $payment = Payment::find($paymentId);

        if (! $payment) {
            $this->error("Payment {$paymentId} not found.");

            return self::FAILURE;
        }

        try {
            $this->reconcileSingle($payment, $gatewayManager, $reconciler);
            $this->info("Payment {$payment->order_id} reconciled successfully.");

            return self::SUCCESS;
        } catch (\Exception $e) {
            $this->error("Failed to reconcile payment: {$e->getMessage()}");

            return self::FAILURE;
        }
    }

    /**
     * Reconcile a payment by order ID.
     */
    private function reconcileOrder(
        string $orderId,
        PaymentGatewayManager $gatewayManager,
        PaymentReconciler $reconciler
    ): int {
        $payment = Payment::where('order_id', $orderId)->first();

        if (! $payment) {
            $this->error("Payment with order ID {$orderId} not found.");

            return self::FAILURE;
        }

        try {
            $this->reconcileSingle($payment, $gatewayManager, $reconciler);
            $this->info("Payment {$payment->order_id} reconciled successfully.");

            return self::SUCCESS;
        } catch (\Exception $e) {
            $this->error("Failed to reconcile payment: {$e->getMessage()}");

            return self::FAILURE;
        }
    }

    /**
     * Reconcile a single payment.
     */
    private function reconcileSingle(
        Payment $payment,
        PaymentGatewayManager $gatewayManager,
        PaymentReconciler $reconciler
    ): void {
        // Skip if already settled
        if ($payment->isSettled()) {
            $this->line("Payment {$payment->order_id} already settled, skipping.");

            return;
        }

        // Skip if no provider set
        if (! $payment->provider) {
            $this->warn("Payment {$payment->order_id} has no provider, skipping.");

            return;
        }

        // Skip manual payments
        if ($payment->provider === Payment::PROVIDER_MANUAL) {
            return;
        }

        // Get the gateway for this payment's provider
        if (! $gatewayManager->hasProvider($payment->provider)) {
            $this->warn("Provider {$payment->provider} not available, skipping payment {$payment->order_id}.");

            return;
        }

        $gateway = $gatewayManager->gateway($payment->provider);

        // Retrieve current status from provider
        $outcome = $gateway->retrieveStatus($payment);

        // Reconcile with the outcome
        $reconciler->reconcile($payment, $outcome);
    }
}
