<?php

namespace App\Console\Commands;

use App\Models\Payment;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class AuditPaymentMigration extends Command
{
    protected $signature = 'payments:audit-migration';

    protected $description = 'Audit payments for migration to Xendit and readiness for Midtrans retirement';

    public function handle()
    {
        $this->info('Starting Payment Migration Audit...');
        $this->newLine();

        // Count payments by provider
        $byProvider = DB::table('payments')
            ->select('provider', DB::raw('count(*) as total'))
            ->groupBy('provider')
            ->get();

        $this->info('Payments by Provider:');
        $this->table(['Provider', 'Total'], $byProvider->map(fn ($row) => [
            $row->provider ?: 'null (manual/legacy)',
            $row->total,
        ]));
        $this->newLine();

        // Sum amounts by provider and status
        $byStatus = DB::table('payments')
            ->select('provider', 'status', DB::raw('count(*) as count'), DB::raw('sum(amount) as total_amount'))
            ->groupBy('provider', 'status')
            ->orderBy('provider')
            ->get();

        $this->info('Amounts by Provider & Status:');
        $this->table(['Provider', 'Status', 'Count', 'Total Amount'], $byStatus->map(fn ($row) => [
            $row->provider ?: 'null',
            $row->status,
            $row->count,
            number_format($row->total_amount, 2),
        ]));
        $this->newLine();

        // Report unresolved legacy attempts
        $unresolvedMidtrans = DB::table('payments')
            ->where('provider', Payment::PROVIDER_MIDTRANS)
            ->whereIn('status', [Payment::STATUS_PENDING, 'creating', 'unknown']) // Or whatever unresolved states are
            ->count();

        $this->info("Unresolved Midtrans Payments: {$unresolvedMidtrans}");
        $this->newLine();

        // Report ambiguous classifications
        $ambiguous = DB::table('payments')
            ->whereNull('provider')
            ->count();
        $this->info("Ambiguous Classifications (null provider): {$ambiguous}");
        $this->newLine();

        // Retirement readiness report
        $this->info('Retirement Readiness Report:');
        if ($unresolvedMidtrans === 0) {
            $this->info('✅ Midtrans has 0 unresolved payments. Safe to retire legacy endpoints/callbacks after drain period.');
        } else {
            $this->warn('❌ Midtrans still has unresolved payments. Wait for drain period or reconcile manually.');
        }
    }
}
