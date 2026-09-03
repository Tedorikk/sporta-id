<?php

use App\Models\Organization;
use App\Models\User;
use Laravel\Fortify\Features;

beforeEach(function () {
    $this->skipUnlessFortifyHas(Features::registration());
});

test('registration screen can be rendered', function () {
    $response = $this->get(route('register'));

    $response->assertOk();
});

test('new users can register', function () {
    $response = $this->post(route('register.store'), [
        'name' => 'Test User',
        'email' => 'test@example.com',
        'organization_name' => 'Test Organization',
        'password' => 'password',
        'password_confirmation' => 'password',
    ]);

    $this->assertAuthenticated();
    $response->assertRedirect(route('dashboard', absolute: false));
});

test('registering creates an organization owned by the new user', function () {
    $this->post(route('register.store'), [
        'name' => 'Test User',
        'email' => 'test@example.com',
        'organization_name' => 'Test Organization',
        'password' => 'password',
        'password_confirmation' => 'password',
    ]);

    $organization = Organization::firstOrFail();
    $user = User::firstOrFail();

    expect(Organization::count())->toBe(1)
        ->and($organization->name)->toBe('Test Organization')
        ->and($organization->slug)->toBe('test-organization')
        ->and($user->roleIn($organization))->toBe(Organization::ROLE_OWNER)
        ->and($user->current_organization_id)->toBe($organization->id);
});

test('an organization name is required to register', function () {
    $this->post(route('register.store'), [
        'name' => 'Test User',
        'email' => 'test@example.com',
        'password' => 'password',
        'password_confirmation' => 'password',
    ])->assertSessionHasErrors('organization_name');

    expect(User::count())->toBe(0)
        ->and(Organization::count())->toBe(0);
});

test('two organizations with the same name get distinct slugs', function () {
    foreach (['first@example.com', 'second@example.com'] as $email) {
        $this->post(route('register.store'), [
            'name' => 'Test User',
            'email' => $email,
            'organization_name' => 'Duplicate Name',
            'password' => 'password',
            'password_confirmation' => 'password',
        ]);

        $this->post(route('logout'));
    }

    expect(Organization::pluck('slug')->all())->toBe(['duplicate-name', 'duplicate-name-2']);
});
