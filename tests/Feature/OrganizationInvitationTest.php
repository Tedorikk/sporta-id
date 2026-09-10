<?php

use App\Mail\OrganizationInvitation as OrganizationInvitationMail;
use App\Models\Organization;
use App\Models\OrganizationInvitation;
use App\Models\User;
use Illuminate\Support\Facades\Mail;

beforeEach(function () {
    Mail::fake();
});

// --- Sending -------------------------------------------------------------

test('a manager can invite someone by email', function () {
    $organization = Organization::factory()->create();
    $admin = memberOf($organization, Organization::ROLE_ADMIN);

    $this->actingAs($admin)
        ->post(route('organizations.members.invitations.store', $organization), [
            'email' => 'invitee@example.com',
            'role' => Organization::ROLE_MEMBER,
        ])->assertRedirect();

    $invitation = OrganizationInvitation::where('email', 'invitee@example.com')->firstOrFail();

    expect($invitation->organization_id)->toBe($organization->id)
        ->and($invitation->role)->toBe(Organization::ROLE_MEMBER)
        ->and($invitation->invited_by_id)->toBe($admin->id)
        ->and($invitation->isPending())->toBeTrue()
        ->and($invitation->token)->toHaveLength(64);

    Mail::assertQueued(OrganizationInvitationMail::class, fn ($mail) => $mail->hasTo('invitee@example.com'));
});

test('re-inviting the same address replaces the outstanding invitation', function () {
    $organization = Organization::factory()->create();
    $owner = memberOf($organization);
    $first = OrganizationInvitation::factory()->for($organization)->create(['email' => 'invitee@example.com']);

    $this->actingAs($owner)
        ->post(route('organizations.members.invitations.store', $organization), [
            'email' => 'invitee@example.com',
            'role' => Organization::ROLE_ADMIN,
        ])->assertRedirect();

    expect(OrganizationInvitation::find($first->id))->toBeNull()
        ->and(OrganizationInvitation::where('email', 'invitee@example.com')->count())->toBe(1);
});

test('inviting an existing member is rejected', function () {
    $organization = Organization::factory()->create();
    $owner = memberOf($organization);
    $member = memberOf($organization, Organization::ROLE_MEMBER);

    $this->actingAs($owner)
        ->post(route('organizations.members.invitations.store', $organization), [
            'email' => $member->email,
            'role' => Organization::ROLE_MEMBER,
        ])->assertSessionHasErrors('email');

    Mail::assertNothingQueued();
});

test('an admin cannot invite someone as an owner', function () {
    $organization = Organization::factory()->create();
    $admin = memberOf($organization, Organization::ROLE_ADMIN);

    $this->actingAs($admin)
        ->post(route('organizations.members.invitations.store', $organization), [
            'email' => 'invitee@example.com',
            'role' => Organization::ROLE_OWNER,
        ])->assertSessionHasErrors('role');

    expect(OrganizationInvitation::count())->toBe(0);
});

test('a plain member cannot invite', function () {
    $organization = Organization::factory()->create();
    $member = memberOf($organization, Organization::ROLE_MEMBER);

    $this->actingAs($member)
        ->post(route('organizations.members.invitations.store', $organization), [
            'email' => 'invitee@example.com',
            'role' => Organization::ROLE_MEMBER,
        ])->assertForbidden();

    expect(OrganizationInvitation::count())->toBe(0);
});

test('a manager can revoke a pending invitation', function () {
    $organization = Organization::factory()->create();
    $owner = memberOf($organization);
    $invitation = OrganizationInvitation::factory()->for($organization)->create();

    $this->actingAs($owner)
        ->delete(route('organizations.members.invitations.destroy', [$organization, $invitation]))
        ->assertRedirect();

    expect(OrganizationInvitation::find($invitation->id))->toBeNull();
});

test('an invitation cannot be revoked through another organization', function () {
    $organization = Organization::factory()->create();
    $other = Organization::factory()->create();
    $owner = memberOf($other);
    $invitation = OrganizationInvitation::factory()->for($organization)->create();

    $this->actingAs($owner)
        ->delete(route('organizations.members.invitations.destroy', [$other, $invitation]))
        ->assertNotFound();

    expect(OrganizationInvitation::find($invitation->id))->not->toBeNull();
});

test('pending invitations are listed for managers but hidden from members', function () {
    $organization = Organization::factory()->create();
    $owner = memberOf($organization);
    $member = memberOf($organization, Organization::ROLE_MEMBER);
    OrganizationInvitation::factory()->for($organization)->create();

    $this->actingAs($owner)
        ->get(route('organizations.members.index', $organization))
        ->assertInertia(fn ($page) => $page->has('invitations', 1));

    $this->actingAs($member)
        ->get(route('organizations.members.index', $organization))
        ->assertInertia(fn ($page) => $page->has('invitations', 0));
});

test('spent invitations are not listed', function () {
    $organization = Organization::factory()->create();
    $owner = memberOf($organization);
    OrganizationInvitation::factory()->for($organization)->expired()->create();
    OrganizationInvitation::factory()->for($organization)->accepted()->create();

    $this->actingAs($owner)
        ->get(route('organizations.members.index', $organization))
        ->assertInertia(fn ($page) => $page->has('invitations', 0));
});

// --- Accepting -----------------------------------------------------------

test('an invitee with no account signs up through the link and joins', function () {
    $organization = Organization::factory()->create();
    $invitation = OrganizationInvitation::factory()->for($organization)->create([
        'email' => 'invitee@example.com',
        'role' => Organization::ROLE_ADMIN,
    ]);

    $this->get(route('invitations.show', $invitation->token))
        ->assertInertia(fn ($page) => $page
            ->component('auth/accept-invitation')
            ->where('state', 'register')
            ->where('email', 'invitee@example.com'));

    $this->post(route('invitations.accept', $invitation->token), [
        'name' => 'New Joiner',
        'password' => 'correct-horse-battery',
        'password_confirmation' => 'correct-horse-battery',
    ])->assertRedirect(route('events.index'));

    $user = User::where('email', 'invitee@example.com')->firstOrFail();

    expect($user->name)->toBe('New Joiner')
        ->and($user->roleIn($organization))->toBe(Organization::ROLE_ADMIN)
        ->and($user->current_organization_id)->toBe($organization->id)
        ->and($user->email_verified_at)->not->toBeNull()
        ->and($invitation->fresh()->accepted_at)->not->toBeNull();

    $this->assertAuthenticatedAs($user);
});

test('an invitee who is signed in as the invited address joins in one click', function () {
    $organization = Organization::factory()->create();
    $existing = memberOf(Organization::factory()->create());
    $invitation = OrganizationInvitation::factory()->for($organization)->create([
        'email' => $existing->email,
    ]);

    $this->actingAs($existing)
        ->get(route('invitations.show', $invitation->token))
        ->assertInertia(fn ($page) => $page->where('state', 'ready'));

    $this->actingAs($existing)
        ->post(route('invitations.accept', $invitation->token))
        ->assertRedirect(route('events.index'));

    expect($existing->fresh()->roleIn($organization))->toBe(Organization::ROLE_MEMBER)
        ->and($invitation->fresh()->accepted_at)->not->toBeNull();
});

test('a guest whose address already has an account is asked to log in first', function () {
    $organization = Organization::factory()->create();
    $existing = User::factory()->create(['email' => 'invitee@example.com']);
    $invitation = OrganizationInvitation::factory()->for($organization)->create([
        'email' => 'invitee@example.com',
    ]);

    $this->get(route('invitations.show', $invitation->token))
        ->assertInertia(fn ($page) => $page->where('state', 'needs_login'));

    $this->post(route('invitations.accept', $invitation->token), [
        'name' => 'Impostor',
        'password' => 'correct-horse-battery',
        'password_confirmation' => 'correct-horse-battery',
    ])->assertForbidden();

    expect($existing->fresh()->roleIn($organization))->toBeNull()
        ->and(User::where('email', 'invitee@example.com')->count())->toBe(1);
});

test('someone signed in as another account cannot take an invitation', function () {
    $organization = Organization::factory()->create();
    $bystander = memberOf(Organization::factory()->create());
    $invitation = OrganizationInvitation::factory()->for($organization)->create([
        'email' => 'invitee@example.com',
    ]);

    $this->actingAs($bystander)
        ->get(route('invitations.show', $invitation->token))
        ->assertInertia(fn ($page) => $page->where('state', 'wrong_account'));

    $this->actingAs($bystander)
        ->post(route('invitations.accept', $invitation->token))
        ->assertForbidden();

    expect($bystander->fresh()->roleIn($organization))->toBeNull();
});

test('an expired invitation cannot be accepted', function () {
    $organization = Organization::factory()->create();
    $invitation = OrganizationInvitation::factory()->for($organization)->expired()->create([
        'email' => 'invitee@example.com',
    ]);

    $this->get(route('invitations.show', $invitation->token))
        ->assertInertia(fn ($page) => $page->where('state', 'expired'));

    $this->post(route('invitations.accept', $invitation->token), [
        'name' => 'Too Late',
        'password' => 'correct-horse-battery',
        'password_confirmation' => 'correct-horse-battery',
    ])->assertForbidden();

    expect(User::where('email', 'invitee@example.com')->exists())->toBeFalse();
});

test('an invitation cannot be accepted twice', function () {
    $organization = Organization::factory()->create();
    $invitation = OrganizationInvitation::factory()->for($organization)->accepted()->create([
        'email' => 'invitee@example.com',
    ]);

    $this->get(route('invitations.show', $invitation->token))
        ->assertInertia(fn ($page) => $page->where('state', 'accepted'));

    $this->post(route('invitations.accept', $invitation->token), [
        'name' => 'Second Go',
        'password' => 'correct-horse-battery',
        'password_confirmation' => 'correct-horse-battery',
    ])->assertForbidden();

    expect(User::where('email', 'invitee@example.com')->exists())->toBeFalse();
});

test('an unknown token is a 404', function () {
    $this->get(route('invitations.show', 'not-a-real-token'))->assertNotFound();
});

test('a revoked invitation stops working', function () {
    $organization = Organization::factory()->create();
    $owner = memberOf($organization);
    $invitation = OrganizationInvitation::factory()->for($organization)->create();
    $token = $invitation->token;

    $this->actingAs($owner)
        ->delete(route('organizations.members.invitations.destroy', [$organization, $invitation]));

    $this->get(route('invitations.show', $token))->assertNotFound();
});

test('accepting with a weak password is rejected and creates nothing', function () {
    $organization = Organization::factory()->create();
    $invitation = OrganizationInvitation::factory()->for($organization)->create([
        'email' => 'invitee@example.com',
    ]);

    $this->post(route('invitations.accept', $invitation->token), [
        'name' => 'New Joiner',
        'password' => 'short',
        'password_confirmation' => 'short',
    ])->assertSessionHasErrors('password');

    expect(User::where('email', 'invitee@example.com')->exists())->toBeFalse()
        ->and($invitation->fresh()->accepted_at)->toBeNull();
});
