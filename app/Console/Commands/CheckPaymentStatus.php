<?php

namespace App\Console\Commands;

use App\Models\Registration;
use App\Models\RegistrationOrder;
use App\Services\Payments\PaymentGatewayManager;
use App\Services\Payments\PaymentReconciler;
use Illuminate\Console\Command;

/**
 * Manual recovery tool: actively pulls a registration's (or group order's)
 * payment status from the provider instead of waiting for a webhook — for
 * something stuck on pending_payment because the notification URL was
 * never configured (or a webhook was missed), even though the payment
 * actually went through.
 */
class CheckPaymentStatus extends Command
{
    protected $signature = 'payments:check-status
        {registration : Registration ID to reconcile (or order ID with --order)}
        {--order : Treat the ID as a RegistrationOrder id instead of a Registration id}';

    protected $description = "Pull a registration's (or order's) latest payment status directly from the provider and reconcile it";

    public function handle(PaymentGatewayManager $gatewayManager, PaymentReconciler $reconciler): int
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

        $provider = $payment->provider ?? 'midtrans';

        $this->info("Checking {$provider} for order {$payment->order_id}...");

        $outcome = $gatewayManager->gateway($provider)->retrieveStatus($payment);

        $this->line("Provider status: {$outcome->providerStatus}");

        $statusBefore = $payable->status;

        $reconciler->reconcile($payment, $outcome);

        $statusAfter = $payable->fresh()->status;

        $this->info(class_basename($payable)." #{$payable->id}: {$statusBefore} -> {$statusAfter}");

        return self::SUCCESS;
    }
}
