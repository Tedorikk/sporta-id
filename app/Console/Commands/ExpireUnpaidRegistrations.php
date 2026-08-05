<?php

namespace App\Console\Commands;

use App\Models\Registration;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

/**
 * Safety net for the Midtrans webhook: a registration's Snap transaction
 * normally sends its own "expire" notification, but if that webhook is ever
 * missed, an overdue pending_payment registration would hold its quota slot
 * forever. This releases it.
 */
class ExpireUnpaidRegistrations extends Command
{
    protected $signature = 'registrations:expire-unpaid';

    protected $description = 'Expire pending-payment registrations past their expiry and release their quota';

    public function handle(): int
    {
        $registrations = Registration::where('status', Registration::STATUS_PENDING_PAYMENT)
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

        $this->info("Expired {$registrations->count()} unpaid registration(s).");

        return self::SUCCESS;
    }
}
