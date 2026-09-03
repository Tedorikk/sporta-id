<?php

use App\Models\Organization;
use App\Models\User;

test('guests are redirected to the login page', function () {
    $response = $this->get(route('dashboard'));
    $response->assertRedirect(route('login'));
});

test('authenticated users can visit the dashboard', function () {
    $this->actingAs(memberOf(Organization::factory()->create()));

    $response = $this->get(route('dashboard'));
    $response->assertOk();
});

test('users without an organization are sent to the organizations page', function () {
    $this->actingAs(User::factory()->create());

    $this->get(route('dashboard'))
        ->assertRedirect(route('organizations.index'));
});
