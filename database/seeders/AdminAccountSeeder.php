<?php

namespace Database\Seeders;

use App\Models\Organization;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class AdminAccountSeeder extends Seeder
{
    public function run(): void
    {
        $name = config('admin.name');
        $email = config('admin.email');
        $password = config('admin.password');

        if (blank($name) || blank($email) || blank($password)) {
            return;
        }

        $user = User::updateOrCreate(
            ['email' => $email],
            [
                'name' => $name,
                'password' => Hash::make($password),
            ]
        );

        $organization = Organization::defaultForSeeding();

        if (! $user->belongsToOrganization($organization)) {
            $organization->users()->attach($user, ['role' => Organization::ROLE_OWNER]);
        }

        $user->forceFill(['current_organization_id' => $organization->id])->save();
    }
}
