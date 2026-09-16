<?php

use App\Models\Registration;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

return new class extends Migration
{
    /**
     * Snapshot of BasketballEventCategory::defaultFormPages() at the time of
     * this migration: the payment evidence a bank-transfer entry needs.
     */
    private const DEFAULT_FORM_PAGES = [
        [
            'key' => 'page-1',
            'title' => 'Pembayaran',
            'fields' => [
                [
                    'key' => 'bukti_pembayaran',
                    'label' => 'Bukti Pembayaran',
                    'type' => 'document',
                    'required' => true,
                    'help_text' => 'Unggah bukti transfer biaya pendaftaran tim.',
                ],
                [
                    'key' => 'nama_rekening_pembayaran',
                    'label' => 'Nama Rekening yang Melakukan Pembayaran',
                    'type' => 'text',
                    'required' => true,
                ],
            ],
        ],
    ];

    /**
     * Every basketball category becomes the tournament config behind a
     * registration category, and every team that entered through the legacy
     * basketball form gets the Registration row the generic flow would have
     * created for it. This runs before the columns it copies from are dropped
     * and before the FK becomes required, so the invariants the app assumes
     * afterwards ("a category always sells through a registration category",
     * "a team always has a registration") already hold for existing data.
     *
     * Uses the query builder rather than Eloquent so this migration keeps working
     * if the models later gain required attributes or boot hooks.
     */
    public function up(): void
    {
        DB::transaction(function () {
            $this->linkCategories();
            $this->registerTeams();
        });
    }

    private function linkCategories(): void
    {
        $orphans = DB::table('basketball_event_categories as c')
            ->join('basketball_events as b', 'b.id', '=', 'c.basketball_event_id')
            ->join('events as e', function ($join) {
                $join->on('e.eventable_id', '=', 'b.id')
                    ->where('e.eventable_type', '=', 'App\\Models\\BasketballEvent');
            })
            ->whereNull('c.registration_category_id')
            ->orderBy('c.id')
            ->get(['c.id', 'c.name', 'c.price', 'c.quota', 'c.status', 'e.id as event_id', 'c.created_at']);

        foreach ($orphans as $category) {
            // After a rollback the minted category is still there, just unlinked;
            // reattach it instead of leaving its registrations behind a duplicate.
            $existingId = DB::table('registration_categories as rc')
                ->where('rc.event_id', $category->event_id)
                ->where('rc.subject_type', 'team')
                ->where('rc.name', $category->name)
                ->whereNotExists(function ($query) {
                    $query->selectRaw('1')
                        ->from('basketball_event_categories as linked')
                        ->whereColumn('linked.registration_category_id', 'rc.id');
                })
                ->orderBy('rc.id')
                ->value('rc.id');

            if ($existingId !== null) {
                DB::table('basketball_event_categories')
                    ->where('id', $category->id)
                    ->update(['registration_category_id' => $existingId]);

                continue;
            }

            $registeredCount = DB::table('teams')
                ->where('basketball_event_category_id', $category->id)
                ->where('status', '!=', 'rejected')
                ->count();

            $registrationCategoryId = DB::table('registration_categories')->insertGetId([
                'event_id' => $category->event_id,
                'name' => $category->name,
                'slug' => Str::slug($category->name).'-'.Str::lower(Str::random(4)),
                'subject_type' => 'team',
                'price' => $category->price,
                'quota' => $category->quota,
                'registered_count' => $registeredCount,
                // The legacy status enum was free text ("OPEN", "PENDING", ...);
                // anything not explicitly closed keeps selling.
                'registration_open' => ! in_array(strtolower((string) $category->status), ['closed', 'inactive'], true),
                'form_pages' => json_encode(self::DEFAULT_FORM_PAGES),
                'status' => 'active',
                'created_at' => $category->created_at ?? now(),
                'updated_at' => now(),
            ]);

            DB::table('basketball_event_categories')
                ->where('id', $category->id)
                ->update(['registration_category_id' => $registrationCategoryId]);
        }
    }

    private function registerTeams(): void
    {
        $teams = DB::table('teams as t')
            ->join('basketball_event_categories as c', 'c.id', '=', 't.basketball_event_category_id')
            ->whereNotNull('c.registration_category_id')
            ->whereNotExists(function ($query) {
                $query->selectRaw('1')
                    ->from('registrations as r')
                    ->whereColumn('r.team_id', 't.id');
            })
            ->orderBy('t.id')
            ->get(['t.id', 't.event_id', 't.name', 't.status', 't.created_at', 'c.registration_category_id']);

        foreach ($teams as $team) {
            DB::table('registrations')->insert([
                'registration_category_id' => $team->registration_category_id,
                'event_id' => $team->event_id,
                'team_id' => $team->id,
                'name' => $team->name,
                'qr_token' => (string) Str::uuid(),
                'verification_code' => Registration::generateVerificationCode(),
                'form_data' => json_encode([]),
                // Legacy teams never paid through the app, so there's nothing
                // pending; a rejected team's registration is rejected too.
                'status' => $team->status === 'rejected' ? 'rejected' : 'confirmed',
                'created_at' => $team->created_at ?? now(),
                'updated_at' => now(),
            ]);
        }
    }

    /**
     * The minted registration categories and registrations are indistinguishable
     * from ones created through the app once real registrations land on them,
     * so rolling back only severs the link and leaves the data in place.
     */
    public function down(): void
    {
        DB::table('basketball_event_categories')->update(['registration_category_id' => null]);
    }
};
