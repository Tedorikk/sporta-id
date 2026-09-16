<?php

namespace App\Console\Commands;

use App\Models\Payment;
use App\Models\Registration;
use App\Models\RegistrationOrder;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

/**
 * Safety net for the Midtrans webhook: a registration's (or order's) Snap
 * transaction normally sends its own "expire" notification, but if that
 * webhook is ever missed, an overdue pending_payment record would hold its
 * quota slot forever. This releases it.
 */
class ExpireUnpaidRegistrations extends Command
{
    protected $signature = 'registrations:expire-unpaid';

    protected $description = 'Expire pending-payment registrations and orders past their expiry and release their quota';

    public function handle(): int
    {
        $expiredRegistrations = $this->expireSoloRegistrations();
        $expiredOrders = $this->expireOrders();

        $this->info("Expired {$expiredRegistrations} unpaid registration(s) and {$expiredOrders} unpaid order(s).");

        return self::SUCCESS;
    }

    /** Registrations bought outside a group order — each releases its own quota. */
    private function expireSoloRegistrations(): int
    {
        $registrations = Registration::where('status', Registration::STATUS_PENDING_PAYMENT)
            ->whereNull('registration_order_id')
            ->whereNotNull('expires_at')
            ->where('expires_at', '<', now())
            ->get();

        foreach ($registrations as $registration) {
            DB::transaction(function () use ($registration) {
                $locked = Registration::whereKey($registration->id)->lockForUpdate()->first();

                if ($locked->status !== Registration::STATUS_PENDING_PAYMENT) {
                    return;
                }

                $locked->update(['status' => Registration::STATUS_EXPIRED]);
                $locked->registrationCategory()->decrement('registered_count');
            });
        }

        return $registrations->count();
    }

    /**
     * A group order expires as a whole — every participant in it shares the
     * one payment that timed out, so {@see RegistrationOrder::applyPaymentStatus()}
     * (the same path the Midtrans webhook drives) releases every one of
     * their quota slots together.
     */
    private function expireOrders(): int
    {
        $orders = RegistrationOrder::where('status', RegistrationOrder::STATUS_PENDING_PAYMENT)
            ->whereNotNull('expires_at')
            ->where('expires_at', '<', now())
            ->get();

        foreach ($orders as $order) {
            DB::transaction(function () use ($order) {
                $locked = RegistrationOrder::whereKey($order->id)->lockForUpdate()->first();
                $payment = $locked->latestPayment();

                if ($locked->status !== RegistrationOrder::STATUS_PENDING_PAYMENT || $payment === null) {
                    return;
                }

                $locked->applyPaymentStatus($payment, Payment::STATUS_EXPIRE);
            });
        }

        return $orders->count();
    }
}
