<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('registration_categories', function (Blueprint $table) {
            $table->json('form_pages')->nullable()->after('form_schema');
            $table->json('form_branding')->nullable()->after('form_pages');
            $table->json('form_settings')->nullable()->after('form_branding');
        });

        // Wrap each category's flat field list as a single page so existing
        // forms keep working unchanged under the new multi-page shape.
        DB::table('registration_categories')->orderBy('id')->each(function ($category) {
            $fields = json_decode($category->form_schema ?? '[]', true) ?: [];

            DB::table('registration_categories')->where('id', $category->id)->update([
                'form_pages' => json_encode([
                    ['key' => 'page-1', 'title' => 'Details', 'fields' => $fields],
                ]),
            ]);
        });

        Schema::table('registration_categories', function (Blueprint $table) {
            $table->dropColumn('form_schema');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('registration_categories', function (Blueprint $table) {
            $table->json('form_schema')->nullable()->after('closes_at');
        });

        DB::table('registration_categories')->orderBy('id')->each(function ($category) {
            $pages = json_decode($category->form_pages ?? '[]', true) ?: [];
            $fields = collect($pages)->flatMap(fn ($page) => $page['fields'] ?? [])->values()->all();

            DB::table('registration_categories')->where('id', $category->id)->update([
                'form_schema' => json_encode($fields),
            ]);
        });

        Schema::table('registration_categories', function (Blueprint $table) {
            $table->dropColumn(['form_pages', 'form_branding', 'form_settings']);
        });
    }
};
