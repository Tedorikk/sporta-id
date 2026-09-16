<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

/**
 * A distance used to point at the one form it sold through, and carried a
 * price and quota of its own. Runners buy a registration category — "5K with
 * jersey", "5K without jersey" — and several of those can feed the same
 * distance's start list, so the link flips: the registration category names
 * its distance, and the distance keeps only race config (start time, cut-off,
 * bib ranges). Every distance that sold on its own gets the registration
 * category the generic flow would have created for it, so nothing that was
 * on sale stops being on sale.
 */
return new class extends Migration
{
    /**
     * SQLite can only toggle its foreign_keys pragma outside a transaction,
     * and this migration relies on that toggle: running_event_categories is
     * rebuilt twice (dropConstrainedForeignId, dropColumn) while a foreign
     * key from registration_categories points at it, and with the pragma
     * stuck on inside a transaction each rebuild's DROP TABLE would fire
     * that key's ON DELETE SET NULL and erase the links just written.
     */
    public $withinTransaction = false;

    /**
     * Snapshot of RunningEventCategory::defaultFormPages() at the time of
     * this migration: what a race entry collects.
     */
    private const DEFAULT_FORM_PAGES = [
        [
            'key' => 'data-pelari',
            'title' => 'Data Pelari',
            'fields' => [
                ['key' => 'email', 'label' => 'Email', 'type' => 'email', 'required' => true],
                ['key' => 'phone', 'label' => 'No. WhatsApp', 'type' => 'phone', 'required' => true],
                ['key' => 'dob', 'label' => 'Tanggal Lahir', 'type' => 'date', 'required' => true],
                ['key' => 'gender', 'label' => 'Jenis Kelamin', 'type' => 'gender', 'required' => true],
                ['key' => 'nationality', 'label' => 'Kewarganegaraan', 'type' => 'select', 'required' => true, 'options' => ['WNI', 'WNA']],
                ['key' => 'jersey_size', 'label' => 'Ukuran Jersey', 'type' => 'select', 'required' => true, 'options' => ['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL']],
                ['key' => 'emergency_contact', 'label' => 'Kontak Darurat', 'type' => 'phone', 'required' => false],
            ],
        ],
        [
            'key' => 'dokumen',
            'title' => 'Foto & Identitas',
            'fields' => [
                ['key' => 'photo', 'label' => 'Foto Wajah', 'type' => 'file', 'required' => true, 'image_ratio' => 'portrait'],
                ['key' => 'identity_card', 'label' => 'Kartu Identitas (KTP/Paspor)', 'type' => 'file', 'required' => true, 'image_ratio' => 'landscape'],
                ['key' => 'agree_rules', 'label' => 'Persetujuan', 'type' => 'checkbox', 'required' => true, 'help_text' => 'Saya telah membaca dan menyetujui peraturan lomba.'],
            ],
        ],
    ];

    public function up(): void
    {
        $this->addDistanceColumnToRegistrationCategories();

        // Read every existing link before its column goes away, and mint the
        // rest, collecting registration_category_id => distance_id either
        // way. dropConstrainedForeignId() below rebuilds running_event_categories
        // (SQLite has no in-place way to drop a foreign key), and that
        // rebuild's DROP TABLE would fire this new column's ON DELETE SET
        // NULL against any row already pointing at it — so nothing is
        // written back here; it happens once the rebuild is done.
        $links = DB::table('running_event_categories')
            ->whereNotNull('registration_category_id')
            ->orderBy('id')
            ->pluck('registration_category_id', 'id')
            ->all();

        $links += $this->mintFormsForUnlinkedDistances();

        Schema::table('running_event_categories', function (Blueprint $table) {
            $table->dropConstrainedForeignId('registration_category_id');
            $table->dropColumn(['price', 'quota', 'status']);
        });

        Schema::table('running_event_categories', function (Blueprint $table) {
            // Independent men's and women's bib sequences ("1–2999 male,
            // 3000+ female"); null falls back to bib_start_number.
            $table->unsignedInteger('bib_start_male')->nullable()->after('bib_start_number');
            $table->unsignedInteger('bib_start_female')->nullable()->after('bib_start_male');
            // Age on race day; enforced at registration when set.
            $table->unsignedTinyInteger('minimum_age')->nullable()->after('bib_start_female');
        });

        foreach ($links as $distanceId => $registrationCategoryId) {
            DB::table('registration_categories')
                ->where('id', $registrationCategoryId)
                ->update(['running_event_category_id' => $distanceId]);
        }

        Schema::table('race_participants', function (Blueprint $table) {
            // Snapshots, like name/email/phone — what the bib sequence and
            // age-group results key on.
            $table->string('gender')->nullable()->after('phone');
            $table->date('dob')->nullable()->after('gender');
        });
    }

    /**
     * SQLite can only add a foreign key by rebuilding the table, and the
     * rebuild drops the old copy — which, inside a transaction (where the
     * foreign_keys pragma is a no-op), cascade-deletes every row pointing
     * at registration_categories. Its native ADD COLUMN accepts an inline
     * REFERENCES clause, so that is used instead; other drivers take the
     * ordinary constrained column.
     */
    private function addDistanceColumnToRegistrationCategories(): void
    {
        if (DB::getDriverName() === 'sqlite') {
            DB::statement(
                'alter table "registration_categories" add column "running_event_category_id" integer null '
                .'references "running_event_categories"("id") on delete set null'
            );

            Schema::table('registration_categories', function (Blueprint $table) {
                $table->index('running_event_category_id');
            });

            return;
        }

        Schema::table('registration_categories', function (Blueprint $table) {
            $table->foreignId('running_event_category_id')->nullable()->after('event_id')
                ->constrained()->nullOnDelete();
        });
    }

    /**
     * A distance with no form still had a price and a quota — the columns
     * being dropped — so it becomes a registration category of its own,
     * with the default race-entry form. Returns the link to write back once
     * the distance table is done being rebuilt (distance_id =>
     * registration_category_id), rather than writing it here — see up().
     *
     * @return array<int, int>
     */
    private function mintFormsForUnlinkedDistances(): array
    {
        $orphans = DB::table('running_event_categories as c')
            ->join('running_events as r', 'r.id', '=', 'c.running_event_id')
            ->join('events as e', function ($join) {
                $join->on('e.eventable_id', '=', 'r.id')
                    ->where('e.eventable_type', '=', 'App\\Models\\RunningEvent');
            })
            ->whereNull('c.registration_category_id')
            ->orderBy('c.id')
            ->get(['c.id', 'c.name', 'c.price', 'c.quota', 'c.status', 'e.id as event_id', 'c.created_at']);

        $links = [];

        foreach ($orphans as $distance) {
            // After a rollback the minted category is still there, just
            // unlinked; reattach it rather than minting a duplicate.
            $existingId = DB::table('registration_categories')
                ->where('event_id', $distance->event_id)
                ->where('subject_type', 'individual')
                ->where('name', $distance->name)
                ->whereNull('running_event_category_id')
                ->orderBy('id')
                ->value('id');

            if ($existingId !== null) {
                $links[$distance->id] = $existingId;

                continue;
            }

            $links[$distance->id] = DB::table('registration_categories')->insertGetId([
                'event_id' => $distance->event_id,
                'name' => $distance->name,
                'slug' => Str::slug($distance->name).'-'.Str::lower(Str::random(4)),
                'subject_type' => 'individual',
                'price' => $distance->price,
                'quota' => $distance->quota,
                'registered_count' => 0,
                'registration_open' => ! in_array(strtolower((string) $distance->status), ['closed', 'inactive'], true),
                'form_pages' => json_encode(self::DEFAULT_FORM_PAGES),
                'status' => 'active',
                'created_at' => $distance->created_at ?? now(),
                'updated_at' => now(),
            ]);
        }

        return $links;
    }

    /**
     * Restores the columns and, for each distance, points it back at the
     * first form that sold it; the minted categories stay (they may hold
     * registrations by now) and lose only the link.
     */
    public function down(): void
    {
        Schema::table('race_participants', function (Blueprint $table) {
            $table->dropColumn(['gender', 'dob']);
        });

        Schema::table('running_event_categories', function (Blueprint $table) {
            $table->dropColumn(['bib_start_male', 'bib_start_female', 'minimum_age']);
        });

        Schema::table('running_event_categories', function (Blueprint $table) {
            $table->foreignId('registration_category_id')->nullable()
                ->constrained()->nullOnDelete();
            $table->decimal('price', 12, 2)->nullable();
            $table->unsignedInteger('quota')->nullable();
            $table->string('status')->default('active');
        });

        $forms = DB::table('registration_categories')
            ->whereNotNull('running_event_category_id')
            ->orderBy('id')
            ->get(['id', 'running_event_category_id', 'price', 'quota']);

        foreach ($forms->unique('running_event_category_id') as $form) {
            DB::table('running_event_categories')
                ->where('id', $form->running_event_category_id)
                ->update([
                    'registration_category_id' => $form->id,
                    'price' => $form->price,
                    'quota' => $form->quota,
                ]);
        }

        Schema::table('registration_categories', function (Blueprint $table) {
            if (DB::getDriverName() === 'sqlite') {
                $table->dropIndex(['running_event_category_id']);
                $table->dropColumn('running_event_category_id');
            } else {
                $table->dropConstrainedForeignId('running_event_category_id');
            }
        });
    }
};
