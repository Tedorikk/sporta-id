<?php

use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

// Midtrans (and every other payment gateway) checks that a merchant site
// publishes these publicly before it will approve a production account.
test('the legal pages are publicly reachable', function (string $route, string $component) {
    $this->get(route($route))
        ->assertOk()
        ->assertInertia(fn ($page) => $page->component($component));
})->with([
    ['terms', 'terms'],
    ['privacy', 'privacy'],
    ['refund-policy', 'refund-policy'],
]);
