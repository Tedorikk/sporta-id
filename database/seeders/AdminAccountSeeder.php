<?php

namespace Database\Seeders;

use App\Models\Organization;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class AdminAccountSeeder extends Seeder
{
    public function run()
    {
        $user = User::updateOrCreate(
            ['email' => config('admin.email')],
            [
                'name' => config('admin.name'),
                'password' => Hash::make(config('admin.password')),
            ]
        );

        $organization = Organization::defaultForSeeding();

        if (! $user->belongsToOrganization($organization)) {
            $organization->users()->attach($user, ['role' => Organization::ROLE_OWNER]);
        }

        $user->forceFill(['current_organization_id' => $organization->id])->save();
    }
}
