<?php

namespace App\Console\Commands;

use App\Models\Registration;
use App\Models\RegistrationOrder;
use App\Services\Midtrans\MidtransClient;
use App\Services\Midtrans\PaymentReconciler;
use Illuminate\Console\Command;

/**
 * Manual recovery tool: actively pulls a registration's (or group order's)
 * payment status from Midtrans instead of waiting for a webhook — for
 * something stuck on pending_payment because the notification URL was
 * never configured (or a webhook was missed), even though the payment
 * actually went through.
 */
class CheckPaymentStatus extends Command
{
    protected $signature = 'payments:check-status
        {registration : Registration ID to reconcile (or order ID with --order)}
        {--order : Treat the ID as a RegistrationOrder id instead of a Registration id}';

    protected $description = "Pull a registration's (or order's) latest payment status directly from Midtrans and reconcile it";

    public function handle(MidtransClient $midtrans, PaymentReconciler $reconciler): int
    {
        $payable = $this->option('order')
            ? RegistrationOrder::find($this->argument('registration'))
            : Registration::find($this->argument('registration'));

        if (! $payable) {
            $this->error('No '.($this->option('order') ? 'order' : 'registration').' found with that ID.');

            return self::FAILURE;
        }

        $payment = $payable->latestPayment();

        if (! $payment) {
            $this->error(class_basename($payable)." #{$payable->id} has no payment on record.");

            return self::FAILURE;
        }

        $this->info("Checking Midtrans for order {$payment->order_id}...");

        $transaction = $midtrans->getStatus($payment->order_id);

        $this->line('Midtrans transaction_status: '.($transaction['transaction_status'] ?? 'unknown'));

        $statusBefore = $payable->status;

        $reconciler->reconcile($payment, $transaction);

        $statusAfter = $payable->fresh()->status;

        $this->info(class_basename($payable)." #{$payable->id}: {$statusBefore} -> {$statusAfter}");

        return self::SUCCESS;
    }
}
