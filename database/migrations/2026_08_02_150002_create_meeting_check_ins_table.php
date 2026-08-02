<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('meeting_check_ins', function (Blueprint $table) {
            $table->id();
            $table->foreignId('meeting_id')->constrained()->cascadeOnDelete();
            $table->foreignId('registration_id')->constrained()->cascadeOnDelete();
            $table->string('status')->default('present');
            $table->string('method')->default('manual');
            $table->foreignId('checked_in_by')->nullable()->constrained('users')->nullOnDelete();
            $table->dateTime('scanned_at')->nullable();
            $table->timestamps();

            $table->unique(['meeting_id', 'registration_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('meeting_check_ins');
    }
};
