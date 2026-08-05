<?php

namespace App\Console\Commands;

use App\Models\Registration;
use App\Services\Midtrans\MidtransClient;
use App\Services\Midtrans\PaymentReconciler;
use Illuminate\Console\Command;

/**
 * Manual recovery tool: actively pulls a registration's payment status from
 * Midtrans instead of waiting for a webhook — for a registration stuck on
 * pending_payment because the notification URL was never configured (or a
 * webhook was missed), even though the payment actually went through.
 */
class CheckPaymentStatus extends Command
{
    protected $signature = 'payments:check-status {registration : Registration ID to reconcile}';

    protected $description = "Pull a registration's latest payment status directly from Midtrans and reconcile it";

    public function handle(MidtransClient $midtrans, PaymentReconciler $reconciler): int
    {
        $registration = Registration::find($this->argument('registration'));

        if (! $registration) {
            $this->error('No registration found with that ID.');

            return self::FAILURE;
        }

        $payment = $registration->latestPayment();

        if (! $payment) {
            $this->error("Registration #{$registration->id} has no payment on record.");

            return self::FAILURE;
        }

        $this->info("Checking Midtrans for order {$payment->order_id}...");

        $transaction = $midtrans->getStatus($payment->order_id);

        $this->line('Midtrans transaction_status: '.($transaction['transaction_status'] ?? 'unknown'));

        $statusBefore = $registration->status;

        $reconciler->reconcile($payment, $transaction);

        $statusAfter = $registration->fresh()->status;

        $this->info("Registration #{$registration->id}: {$statusBefore} -> {$statusAfter}");

        return self::SUCCESS;
    }
}
