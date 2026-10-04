<?php

namespace App\Console\Commands;

use App\Models\RegistrationCategory;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

#[Signature('payments:normalize-methods {--dry-run : Report matching rows without updating them} {--chunk=500 : Number of rows to update per batch}')]
#[Description('Normalize legacy registration category payment_method values from midtrans to online')]
class NormalizePaymentMethods extends Command
{
    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $chunkSize = max(1, (int) $this->option('chunk'));
        $dryRun = (bool) $this->option('dry-run');
        $query = RegistrationCategory::query()
            ->where('payment_method', RegistrationCategory::PAYMENT_METHOD_MIDTRANS);
        $total = (clone $query)->count();

        if ($total === 0) {
            $this->info('No legacy Midtrans category payment methods found.');

            return self::SUCCESS;
        }

        if ($dryRun) {
            $this->info("{$total} category payment method(s) would be normalized from midtrans to online.");

            return self::SUCCESS;
        }

        $updated = 0;

        $query->select('id')
            ->orderBy('id')
            ->chunkById($chunkSize, function ($categories) use (&$updated) {
                $ids = $categories->pluck('id');

                $updated += DB::table((new RegistrationCategory)->getTable())
                    ->whereIn('id', $ids)
                    ->where('payment_method', RegistrationCategory::PAYMENT_METHOD_MIDTRANS)
                    ->update(['payment_method' => RegistrationCategory::PAYMENT_METHOD_ONLINE]);
            });

        $this->info("Normalized {$updated} category payment method(s) from midtrans to online.");

        return self::SUCCESS;
    }
}
