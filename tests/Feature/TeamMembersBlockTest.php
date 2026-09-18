<?php

use App\Models\Event;
use App\Models\Registration;
use App\Models\RegistrationCategory;
use App\Models\Team;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

function teamMembersCategory(): RegistrationCategory
{
    $event = Event::factory()->create(['category' => 'CONFERENCE']);

    return RegistrationCategory::factory()->team()->for($event)->create(['form_pages' => [
        ['key' => 'p', 'title' => 'Members', 'fields' => [[
            'key' => 'members', 'label' => 'Members', 'type' => 'team_members', 'required' => true,
            'slots' => [
                ['role' => 'dancer', 'label' => 'Dancer', 'min' => 4, 'max' => 10],
                ['role' => 'choreographer', 'label' => 'Choreographer', 'min' => 0, 'max' => 1],
            ],
            'member_fields' => [],
        ]]],
    ]]);
}

test('an organiser can put a custom-role team-members block on a non-basketball team category', function () {
    $event = Event::factory()->create(['category' => 'CONFERENCE']);
    $this->actingAs(organizerOf($event));

    $payload = [
        'name' => 'Dance Squad', 'subject_type' => RegistrationCategory::SUBJECT_TEAM, 'registration_open' => true,
        'form_pages' => [['key' => 'p', 'title' => 'Members', 'fields' => [[
            'key' => 'members', 'label' => 'Members', 'type' => 'team_members', 'required' => true,
            'slots' => [['role' => 'dancer', 'label' => 'Dancer', 'min' => 4, 'max' => 10]],
            'member_fields' => [],
        ]]]],
    ];

    $this->post(route('registration_categories.store', $event), $payload)
        ->assertRedirect()->assertSessionHasNoErrors();

    expect(RegistrationCategory::sole()->teamMembersField()['slots'][0]['role'])->toBe('dancer');
});

test('a team-members block is rejected alongside a roster block, and on an individual category', function () {
    $event = Event::factory()->create(['category' => 'CONFERENCE']);
    $this->actingAs(organizerOf($event));

    $teamMembersBlock = [
        'key' => 'members', 'label' => 'Members', 'type' => 'team_members', 'required' => true,
        'slots' => [['role' => 'dancer', 'label' => 'Dancer', 'min' => 4, 'max' => 10]],
        'member_fields' => [],
    ];
    $rosterBlock = [
        'key' => 'roster', 'label' => 'Roster', 'type' => 'roster', 'required' => true,
        'slots' => [['role' => 'player', 'label' => 'Player', 'min' => 5, 'max' => 12]],
        'member_fields' => [],
    ];

    $this->post(route('registration_categories.store', $event), [
        'name' => 'Bad', 'subject_type' => RegistrationCategory::SUBJECT_TEAM, 'registration_open' => true,
        'form_pages' => [['key' => 'p', 'title' => 'Members', 'fields' => [$teamMembersBlock, $rosterBlock]]],
    ])->assertSessionHasErrors('form_pages');

    $this->post(route('registration_categories.store', $event), [
        'name' => 'Bad', 'subject_type' => RegistrationCategory::SUBJECT_INDIVIDUAL, 'registration_open' => true,
        'form_pages' => [['key' => 'p', 'title' => 'Members', 'fields' => [$teamMembersBlock]]],
    ])->assertSessionHasErrors('form_pages');

    expect(RegistrationCategory::count())->toBe(0);
});

test('registering creates a team with custom-role members, enforcing slot min/max', function () {
    $category = teamMembersCategory();

    $tooFew = $this->post(route('registrations.store', [$category->event, $category]), [
        'name' => 'Crew A',
        'form_data' => [],
        'members' => [
            ['role' => 'dancer', 'name' => 'A', 'photo' => 'https://example.com/a.jpg', 'phone_number' => '+6281111111111'],
        ],
    ]);
    $tooFew->assertSessionHasErrors('members');
    expect(Registration::count())->toBe(0);

    $ok = $this->post(route('registrations.store', [$category->event, $category]), [
        'name' => 'Crew A',
        'form_data' => [],
        'members' => [
            ['role' => 'dancer', 'name' => 'A', 'photo' => 'https://example.com/a.jpg', 'phone_number' => '+6281111111111'],
            ['role' => 'dancer', 'name' => 'B', 'photo' => 'https://example.com/b.jpg', 'phone_number' => '+6281111111112'],
            ['role' => 'dancer', 'name' => 'C', 'photo' => 'https://example.com/c.jpg', 'phone_number' => '+6281111111113'],
            ['role' => 'dancer', 'name' => 'D', 'photo' => 'https://example.com/d.jpg', 'phone_number' => '+6281111111114'],
            ['role' => 'choreographer', 'name' => 'E', 'photo' => 'https://example.com/e.jpg', 'phone_number' => '+6281111111115'],
        ],
    ]);
    $ok->assertOk();

    $registration = Registration::sole();
    $team = $registration->team;

    expect($team)->not->toBeNull()
        ->and($team->players()->count())->toBe(5)
        ->and($team->players()->where('role', 'choreographer')->exists())->toBeTrue()
        ->and($team->players()->first()->jersey_number)->toBeNull()
        ->and($team->players()->first()->identity_card)->toBeNull();
});

test('the organize-member portal lets the manager add and remove members after registering', function () {
    $category = teamMembersCategory();
    $team = Team::factory()->pending()->create(['event_id' => $category->event_id, 'basketball_event_category_id' => null]);
    $registration = Registration::create([
        'registration_category_id' => $category->id,
        'event_id' => $category->event_id,
        'team_id' => $team->id,
        'name' => $team->name,
        'status' => Registration::STATUS_CONFIRMED,
    ]);

    $this->get(route('team-members.show', $registration))
        ->assertOk()
        ->assertInertia(fn ($page) => $page->component('organize-member'));

    $this->post(route('team-members.store', $registration), [
        'role' => 'dancer', 'name' => 'Late Add', 'photo' => 'https://example.com/l.jpg', 'phone_number' => '+6281111111119',
    ])->assertSessionHasNoErrors();

    $player = $team->players()->sole();
    expect($player->name)->toBe('Late Add')->and($player->role)->toBe('dancer');

    $this->delete(route('team-members.destroy', [$registration, $player]))->assertSessionHasNoErrors();
    expect($team->players()->count())->toBe(0);
});
