<?php

use App\Models\Organization;
use App\Models\User;
use Database\Seeders\AdminAccountSeeder;
use Illuminate\Support\Facades\Hash;

test('it skips admin creation when credentials are not configured', function () {
    config([
        'admin.name' => null,
        'admin.email' => null,
        'admin.password' => null,
    ]);

    $this->seed(AdminAccountSeeder::class);

    expect(User::query()->count())->toBe(0)
        ->and(Organization::query()->count())->toBe(0);
});

test('it creates the configured admin as an owner idempotently', function () {
    config([
        'admin.name' => 'Sporta Admin',
        'admin.email' => 'admin@example.com',
        'admin.password' => 'secret-password',
    ]);

    $this->seed(AdminAccountSeeder::class);
    $this->seed(AdminAccountSeeder::class);

    $user = User::query()->sole();
    $organization = Organization::query()->sole();

    expect($user->name)->toBe('Sporta Admin')
        ->and($user->email)->toBe('admin@example.com')
        ->and(Hash::check('secret-password', $user->password))->toBeTrue()
        ->and($user->current_organization_id)->toBe($organization->id)
        ->and($user->roleIn($organization))->toBe(Organization::ROLE_OWNER)
        ->and($organization->users()->count())->toBe(1);
});
