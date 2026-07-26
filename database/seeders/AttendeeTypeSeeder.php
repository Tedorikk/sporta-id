<?php

namespace Database\Seeders;

use App\Models\AttendeeType;
use Illuminate\Database\Seeder;

class AttendeeTypeSeeder extends Seeder
{
    public function run(): void
    {
        $defaults = [
            ['key' => 'guest', 'label' => 'Guest', 'icon' => 'UserRound', 'color' => '#0ea5e9'],
            ['key' => 'tenant', 'label' => 'Tenant', 'icon' => 'Store', 'color' => '#16a34a'],
            ['key' => 'photographer', 'label' => 'Photographer', 'icon' => 'Camera', 'color' => '#9333ea'],
        ];

        foreach ($defaults as $type) {
            AttendeeType::updateOrCreate(['key' => $type['key']], $type);
        }
    }
}
