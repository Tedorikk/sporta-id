<?php

use App\Models\Event;
use App\Models\Organization;
use App\Models\User;

test('a user can switch to an organization they belong to', function () {
    $first = Organization::factory()->create();
    $second = Organization::factory()->create();
    $user = memberOf($first);
    $second->users()->attach($user, ['role' => Organization::ROLE_MEMBER]);

    $this->actingAs($user)
        ->put(route('organizations.switch', $second))
        ->assertRedirect(route('events.index'));

    expect($user->fresh()->current_organization_id)->toBe($second->id);
});

test('a user cannot switch to an organization they do not belong to', function () {
    $mine = Organization::factory()->create();
    $theirs = Organization::factory()->create();
    $user = memberOf($mine);

    $this->actingAs($user)
        ->put(route('organizations.switch', $theirs))
        ->assertNotFound();

    expect($user->fresh()->current_organization_id)->toBe($mine->id);
});

test('creating an organization makes the creator its owner and switches to it', function () {
    $user = memberOf(Organization::factory()->create());

    $this->actingAs($user)
        ->post(route('organizations.store'), ['name' => 'Second Club'])
        ->assertRedirect(route('events.index'));

    $created = Organization::where('name', 'Second Club')->firstOrFail();

    expect($user->fresh()->current_organization_id)->toBe($created->id)
        ->and($user->fresh()->roleIn($created))->toBe(Organization::ROLE_OWNER);
});

test('an admin can add an existing user as a member', function () {
    $organization = Organization::factory()->create();
    $admin = memberOf($organization, Organization::ROLE_ADMIN);
    $invitee = User::factory()->create(['email' => 'new@example.com']);

    $this->actingAs($admin)
        ->post(route('organizations.members.store', $organization), [
            'email' => 'new@example.com',
            'role' => Organization::ROLE_MEMBER,
        ])->assertRedirect();

    expect($invitee->fresh()->roleIn($organization))->toBe(Organization::ROLE_MEMBER);
});

test('adding an unknown email address is rejected', function () {
    $organization = Organization::factory()->create();
    $admin = memberOf($organization, Organization::ROLE_ADMIN);

    $this->actingAs($admin)
        ->post(route('organizations.members.store', $organization), [
            'email' => 'nobody@example.com',
            'role' => Organization::ROLE_MEMBER,
        ])->assertSessionHasErrors('email');
});

test('an admin cannot grant the owner role', function () {
    $organization = Organization::factory()->create();
    memberOf($organization, Organization::ROLE_OWNER);
    $admin = memberOf($organization, Organization::ROLE_ADMIN);
    User::factory()->create(['email' => 'new@example.com']);

    $this->actingAs($admin)
        ->post(route('organizations.members.store', $organization), [
            'email' => 'new@example.com',
            'role' => Organization::ROLE_OWNER,
        ])->assertSessionHasErrors('role');
});

test('a plain member cannot manage members', function () {
    $organization = Organization::factory()->create();
    memberOf($organization, Organization::ROLE_OWNER);
    $member = memberOf($organization, Organization::ROLE_MEMBER);
    User::factory()->create(['email' => 'new@example.com']);

    $this->actingAs($member)
        ->post(route('organizations.members.store', $organization), [
            'email' => 'new@example.com',
            'role' => Organization::ROLE_MEMBER,
        ])->assertForbidden();
});

test('the last owner cannot be demoted', function () {
    $organization = Organization::factory()->create();
    $owner = memberOf($organization, Organization::ROLE_OWNER);

    $this->actingAs($owner)
        ->patch(route('organizations.members.update', [$organization, $owner]), [
            'role' => Organization::ROLE_MEMBER,
        ])->assertForbidden();

    expect($owner->fresh()->roleIn($organization))->toBe(Organization::ROLE_OWNER);
});

test('the last owner cannot be removed', function () {
    $organization = Organization::factory()->create();
    $owner = memberOf($organization, Organization::ROLE_OWNER);

    $this->actingAs($owner)
        ->delete(route('organizations.members.destroy', [$organization, $owner]))
        ->assertForbidden();

    expect($owner->fresh()->belongsToOrganization($organization))->toBeTrue();
});

test('an owner can be demoted once a second owner exists', function () {
    $organization = Organization::factory()->create();
    $first = memberOf($organization, Organization::ROLE_OWNER);
    $second = memberOf($organization, Organization::ROLE_OWNER);

    $this->actingAs($first)
        ->patch(route('organizations.members.update', [$organization, $second]), [
            'role' => Organization::ROLE_ADMIN,
        ])->assertRedirect();

    expect($second->fresh()->roleIn($organization))->toBe(Organization::ROLE_ADMIN);
});

test('removing a member resets their current organization', function () {
    $organization = Organization::factory()->create();
    $owner = memberOf($organization, Organization::ROLE_OWNER);
    $member = memberOf($organization, Organization::ROLE_MEMBER);

    expect($member->current_organization_id)->toBe($organization->id);

    $this->actingAs($owner)
        ->delete(route('organizations.members.destroy', [$organization, $member]))
        ->assertRedirect();

    expect($member->fresh()->current_organization_id)->toBeNull();
});

test('a user with no organization is redirected out of the dashboard', function () {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->get(route('events.index'))
        ->assertRedirect(route('organizations.index'));

    // The organizations page itself must stay reachable so they can create one.
    $this->actingAs($user)
        ->get(route('organizations.index'))
        ->assertOk();
});

test('an organization with events cannot be deleted', function () {
    $event = Event::factory()->create();
    $owner = organizerOf($event);

    $this->actingAs($owner)
        ->delete(route('organizations.destroy', $event->organization))
        ->assertRedirect();

    expect(Organization::whereKey($event->organization_id)->exists())->toBeTrue();
});

test('only an owner can delete an empty organization', function () {
    $organization = Organization::factory()->create();
    memberOf($organization, Organization::ROLE_OWNER);
    $admin = memberOf($organization, Organization::ROLE_ADMIN);

    $this->actingAs($admin)
        ->delete(route('organizations.destroy', $organization))
        ->assertForbidden();

    expect(Organization::whereKey($organization->id)->exists())->toBeTrue();
});
