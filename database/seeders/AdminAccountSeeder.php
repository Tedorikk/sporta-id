<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\User;
use Illuminate\Support\Facades\Hash;

class AdminAccountSeeder extends Seeder
{
    public function run()
    {
        User::updateOrCreate(
            ['email' => config('admin.email')],
            [
                'name'     => config('admin.name'),
                'password' => Hash::make(config('admin.password')),
            ]
        );
    }
}
