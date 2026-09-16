<?php

use App\Models\Event;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('events', function (Blueprint $table) {
            $table->string('slug')->nullable()->after('name');
        });

        Event::withoutEvents(function () {
            Event::whereNull('slug')->orderBy('id')->each(function (Event $event) {
                $event->forceFill(['slug' => Event::uniqueSlugFor($event->name)])->save();
            });
        });

        Schema::table('events', function (Blueprint $table) {
            $table->string('slug')->nullable(false)->change();
            $table->unique('slug');
        });
    }

    public function down(): void
    {
        Schema::table('events', function (Blueprint $table) {
            $table->dropColumn('slug');
        });
    }
};
