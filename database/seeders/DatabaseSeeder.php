<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // User::factory(10)->create();
        // Attendee types are now seeded per event automatically (see Event::boot()),
        // so there's nothing global left to seed here.
        $this->call(AdminAccountSeeder::class);
    }
}
