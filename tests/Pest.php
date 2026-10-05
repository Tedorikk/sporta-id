<?php

use App\Models\Event;
use App\Models\Organization;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Pest\Browser\Browsable;
use Tests\TestCase;

/*
|--------------------------------------------------------------------------
| Test Case
|--------------------------------------------------------------------------
|
| The closure you provide to your test functions is always bound to a specific PHPUnit test
| case class. By default, that class is "PHPUnit\Framework\TestCase". Of course, you may
| need to change it using the "pest()" function to bind different classes or traits.
|
*/

pest()->extend(TestCase::class)
    ->use(RefreshDatabase::class)
    ->in('Feature', 'Browser');

if (class_exists(Browsable::class)) {
    pest()->use(Browsable::class)->in('Browser');
}

/*
|--------------------------------------------------------------------------
| Expectations
|--------------------------------------------------------------------------
|
| When you're writing tests, you often need to check that values meet certain conditions. The
| "expect()" function gives you access to a set of "expectations" methods that you can use
| to assert different things. Of course, you may extend the Expectation API at any time.
|
*/

expect()->extend('toBeOne', function () {
    return $this->toBe(1);
});

/*
|--------------------------------------------------------------------------
| Functions
|--------------------------------------------------------------------------
|
| While Pest is very powerful out-of-the-box, you may have some testing code specific to your
| project that you don't want to repeat in every file. Here you can also expose helpers as
| global functions to help you to reduce the number of lines of code in your test files.
|
*/

/**
 * Create a user who belongs to the given organization with the given role.
 */
function memberOf(Organization $organization, string $role = Organization::ROLE_OWNER): User
{
    $user = User::factory()->create();

    $organization->users()->attach($user, ['role' => $role]);
    $user->forceFill(['current_organization_id' => $organization->id])->save();

    return $user->fresh();
}

/**
 * Create a user authorized to manage the given event, via its organization.
 */
function organizerOf(Event $event, string $role = Organization::ROLE_OWNER): User
{
    return memberOf($event->organization, $role);
}
