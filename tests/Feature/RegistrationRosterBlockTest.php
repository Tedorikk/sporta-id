<?php

use App\Models\BasketballEventCategory;
use App\Models\Event;
use App\Models\Player;
use App\Models\Registration;
use App\Models\RegistrationCategory;
use App\Services\Basketball\RosterService;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

/** A tournament category whose form carries a roster block: 1 manager, 1 coach, 2–3 players, plus school/class per member. */
function rosterCategory(array $blockOverrides = []): RegistrationCategory
{
    $event = Event::factory()->basketball()->create();
    // The player slot below says 2–3; the tournament's own limits are what
    // count (RegistrationCategory::syncPlayerSlot), so keep them in step here.
    $tournament = BasketballEventCategory::factory()->forEvent($event)->create(['min_player_per_team' => 2, 'max_player_per_team' => 3]);

    $tournament->registrationCategory->update(['form_pages' => [
        ['key' => 'tim', 'title' => 'Data Tim', 'fields' => [
            ['key' => 'asal_kabupaten_kota', 'label' => 'Asal Kabupaten/Kota', 'type' => 'text', 'required' => true],
        ]],
        ['key' => 'peserta', 'title' => 'Peserta', 'fields' => [
            array_merge([
                // These tests exercise the strict path: every member's details on the form.
                'key' => 'roster', 'label' => 'Official & Pemain', 'type' => 'roster', 'required' => true, 'details_on_form' => true,

                'slots' => [
                    ['role' => 'manager', 'label' => 'Manager', 'min' => 1, 'max' => 1],
                    ['role' => 'coach', 'label' => 'Coach', 'min' => 1, 'max' => 1],
                    ['role' => 'player', 'label' => 'Pemain', 'min' => 2, 'max' => 3],
                ],
                'member_fields' => [
                    ['key' => 'asal_sekolah', 'label' => 'Asal Sekolah', 'type' => 'text', 'required' => true],
                    ['key' => 'kelas', 'label' => 'Kelas', 'type' => 'select', 'required' => false, 'options' => ['7', '8', '9']],
                ],
            ], $blockOverrides),
        ]],
    ]]);

    return $tournament->registrationCategory->fresh();
}

function member(string $role, string $name, array $overrides = []): array
{
    return array_merge([
        'role' => $role,
        'name' => $name,
        'jersey_number' => null,
        'photo' => 'https://example.com/'.str($name)->slug().'.jpg',
        'identity_card' => 'https://example.com/'.str($name)->slug().'-ktp.jpg',
        'birthplace' => 'Pontianak',
        'dob' => '2010-01-15',
        'phone_number' => '+628'.str_pad((string) crc32($name), 10, '0'),
        'extra' => ['asal_sekolah' => 'SMP 1', 'kelas' => '8'],
    ], $overrides);
}

function fullRoster(): array
{
    return [
        member('manager', 'Manager M'),
        member('coach', 'Coach C'),
        member('player', 'Player One', ['jersey_number' => '4']),
        member('player', 'Player Two', ['jersey_number' => '5']),
    ];
}

function submitRoster(RegistrationCategory $category, array $roster, array $overrides = [])
{
    return test()->post(route('registrations.store', [$category->event, $category]), array_merge([
        'name' => 'SMP 1 Warriors',
        'form_data' => ['asal_kabupaten_kota' => 'Kubu Raya'],
        'roster' => $roster,
    ], $overrides));
}

// ─── Submitting the block ───────────────────────────────────────────────────

test('a registration with a roster block creates the team sheet in one go', function () {
    $category = rosterCategory();

    submitRoster($category, fullRoster())->assertOk();

    $registration = Registration::sole();
    $team = $registration->team;
    $members = $team->players()->orderBy('name')->get();

    expect($registration->status)->toBe(Registration::STATUS_CONFIRMED)
        ->and($registration->form_data)->toBe(['asal_kabupaten_kota' => 'Kubu Raya'])
        ->and($members)->toHaveCount(4)
        ->and($members->pluck('role')->sort()->values()->all())->toBe(['coach', 'manager', 'player', 'player'])
        ->and($members->firstWhere('name', 'Player One')->jersey_number)->toBe('4')
        ->and($members->firstWhere('name', 'Player One')->extra)->toBe(['asal_sekolah' => 'SMP 1', 'kelas' => '8'])
        ->and($members->firstWhere('name', 'Manager M')->identity_card)->toContain('manager-m-ktp')
        ->and($members->every(fn (Player $p) => $p->qr_token !== null))->toBeTrue();
});

test('the player slot follows the tournament’s min/max players, not the block’s own numbers', function () {
    $category = rosterCategory();
    $category->basketballCategory->update(['min_player_per_team' => 3, 'max_player_per_team' => 3]);
    $category = $category->fresh();

    // The block still stores 2–3, but the form validates against 3–3…
    submitRoster($category, fullRoster())->assertSessionHasErrors('roster');
    submitRoster($category, [
        ...fullRoster(),
        member('player', 'Player Three', ['jersey_number' => '6']),
    ])->assertOk();

    // …and shows 3–3, both on the form and after the organiser saves the builder.
    $slot = collect($category->rosterField()['slots'])->firstWhere('role', 'player');
    expect($slot['min'])->toBe(3)->and($slot['max'])->toBe(3);

    $this->get(route('registrations.create', [$category->event, $category]))
        ->assertInertia(fn ($page) => $page
            ->where('registrationCategory.form_pages.1.fields.0.slots.2.min', 3)
            ->where('registrationCategory.form_pages.1.fields.0.slots.2.max', 3));

    $this->actingAs(organizerOf($category->event))
        ->put(route('registration_categories.update', [$category->event, $category]), [
            'name' => $category->name,
            'subject_type' => $category->subject_type,
            'registration_open' => true,
            'form_pages' => $category->form_pages,
            'tournament' => [
                ...$category->basketballCategory->only('format', 'win_points', 'loss_points', 'min_team', 'max_player_per_coach', 'roster_closes_at'),
                'min_player_per_team' => 4,
                'max_player_per_team' => 9,
            ],
        ])->assertSessionHasNoErrors();

    $stored = collect($category->fresh()->form_pages[1]['fields'][0]['slots'])->firstWhere('role', 'player');
    expect($stored['min'])->toBe(4)->and($stored['max'])->toBe(9);
});

test('the roster is required when the form has a block', function () {
    $category = rosterCategory();

    submitRoster($category, [], ['roster' => null])->assertSessionHasErrors('roster');

    expect(Registration::count())->toBe(0);
});

test('slot minimums and maximums are enforced', function () {
    $category = rosterCategory();

    // No coach, only one player.
    submitRoster($category, [
        member('manager', 'Manager M'),
        member('player', 'Solo', ['jersey_number' => '1']),
    ])->assertSessionHasErrors('roster');

    // Four players against a max of three.
    submitRoster($category, [
        ...fullRoster(),
        member('player', 'Player Three', ['jersey_number' => '6']),
        member('player', 'Player Four', ['jersey_number' => '7']),
    ])->assertSessionHasErrors('roster');

    expect(Registration::count())->toBe(0);
});

test('roles outside the block\'s slots are rejected', function () {
    $category = rosterCategory();

    submitRoster($category, [...fullRoster(), member('medic', 'Dr. M')])
        ->assertSessionHasErrors('roster.4.role');
});

test('each member needs the identity details and players need distinct jersey numbers', function () {
    $category = rosterCategory();

    submitRoster($category, [
        member('manager', 'Manager M', ['identity_card' => null, 'phone_number' => '0812']),
        member('coach', 'Coach C'),
        member('player', 'A', ['jersey_number' => '9']),
        member('player', 'B', ['jersey_number' => '9']),
    ])->assertSessionHasErrors([
        'roster.0.identity_card',
        'roster.0.phone_number',
        'roster.2.jersey_number',
        'roster.3.jersey_number',
    ]);

    submitRoster($category, [
        member('manager', 'Manager M'),
        member('coach', 'Coach C'),
        member('player', 'A', ['jersey_number' => null]),
        member('player', 'B', ['jersey_number' => '2']),
    ])->assertSessionHasErrors('roster.2.jersey_number');
});

test('an extra question can be aimed at some roles only', function () {
    // "Asal Sekolah" for players only; "Kelas" stays for everyone.
    $category = rosterCategory(['member_fields' => [
        ['key' => 'asal_sekolah', 'label' => 'Asal Sekolah', 'type' => 'text', 'required' => true, 'roles' => ['player']],
        ['key' => 'kelas', 'label' => 'Kelas', 'type' => 'select', 'required' => true, 'options' => ['7', '8', '9']],
    ]]);

    // A coach without a school passes; a player without one doesn't.
    submitRoster($category, [
        member('manager', 'Manager M', ['extra' => ['asal_sekolah' => '', 'kelas' => '8']]),
        member('coach', 'Coach C', ['extra' => ['kelas' => '8']]),
        member('player', 'A', ['jersey_number' => '1', 'extra' => ['asal_sekolah' => '', 'kelas' => '8']]),
        member('player', 'B', ['jersey_number' => '2']),
    ])->assertSessionHasErrors(['roster.2.extra.asal_sekolah'])
        ->assertSessionDoesntHaveErrors(['roster.0.extra.asal_sekolah', 'roster.1.extra.asal_sekolah']);

    submitRoster($category, [
        member('manager', 'Manager M', ['extra' => ['kelas' => '8']]),
        member('coach', 'Coach C', ['extra' => ['kelas' => '8']]),
        member('player', 'A', ['jersey_number' => '1']),
        member('player', 'B', ['jersey_number' => '2']),
    ])->assertOk();

    // …and the same narrowing decides who counts as complete.
    $service = app(RosterService::class);
    $fields = $category->fresh()->rosterMemberFields();
    $coach = new Player(member('coach', 'C', ['extra' => ['kelas' => '8']]));
    $player = new Player(member('player', 'P', ['jersey_number' => '3', 'extra' => ['kelas' => '8']]));

    expect($service->isComplete($coach, $fields))->toBeTrue()
        ->and($service->isComplete($player, $fields))->toBeFalse();
});

test('the organiser\'s extra questions are validated per member', function () {
    $category = rosterCategory();

    submitRoster($category, [
        member('manager', 'Manager M', ['extra' => ['asal_sekolah' => '', 'kelas' => '12']]),
        member('coach', 'Coach C'),
        member('player', 'A', ['jersey_number' => '1']),
        member('player', 'B', ['jersey_number' => '2']),
    ])->assertSessionHasErrors([
        'roster.0.extra.asal_sekolah',
        'roster.0.extra.kelas',
    ]);
});

test('a form without a roster block ignores any roster input', function () {
    $event = Event::factory()->basketball()->create();
    $tournament = BasketballEventCategory::factory()->forEvent($event)->create();
    $category = $tournament->registrationCategory;
    $category->update(['form_pages' => [['key' => 'p', 'title' => 'Details', 'fields' => []]]]);

    submitRoster($category->fresh(), fullRoster(), ['form_data' => []])->assertOk();

    expect(Registration::sole()->team->players()->count())->toBe(0);
});

test('a paid registration with a roster still creates the sheet and waits for payment', function () {
    $category = rosterCategory();
    $category->update(['price' => 250000]);

    submitRoster($category->fresh(), fullRoster(), ['email' => 'captain@example.com'])->assertOk();

    $registration = Registration::sole();

    expect($registration->status)->toBe(Registration::STATUS_PENDING_PAYMENT)
        ->and($registration->team->players()->count())->toBe(4);
});

// ─── The portal carries the same extra questions ────────────────────────────

test('the portal validates and stores the extra questions', function () {
    $category = rosterCategory();
    submitRoster($category, fullRoster())->assertOk();
    $registration = Registration::sole();

    $this->post(route('team-roster.store', $registration), member('player', 'Late Add', [
        'jersey_number' => '10',
        'extra' => ['asal_sekolah' => 'SMP 2', 'kelas' => '13'],
    ]))->assertSessionHasErrors('extra.kelas');

    $this->post(route('team-roster.store', $registration), member('player', 'Late Add', [
        'jersey_number' => '10',
        'extra' => ['asal_sekolah' => 'SMP 2', 'kelas' => '9'],
    ]))->assertSessionHasNoErrors();

    expect($registration->team->players()->where('name', 'Late Add')->sole()->extra)
        ->toBe(['asal_sekolah' => 'SMP 2', 'kelas' => '9']);

    $this->get(route('team-roster.show', $registration))
        ->assertInertia(fn ($page) => $page
            ->has('memberFields', 2)
            ->where('memberFields.0.key', 'asal_sekolah'));
});

// ─── Builder rules ──────────────────────────────────────────────────────────

function rosterBlockPayload(array $overrides = []): array
{
    return array_merge([
        'key' => 'roster', 'label' => 'Roster', 'type' => 'roster', 'required' => true,
        'slots' => [['role' => 'player', 'label' => 'Pemain', 'min' => 5, 'max' => 12]],
        'member_fields' => [],
    ], $overrides);
}

function categoryWithBlock(array $block, array $overrides = []): array
{
    return array_merge([
        'name' => 'U-16',
        'subject_type' => RegistrationCategory::SUBJECT_TEAM,
        'registration_open' => true,
        'form_pages' => [['key' => 'p', 'title' => 'Peserta', 'fields' => [$block]]],
        'tournament' => [
            'format' => 'pool_stage', 'win_points' => 2, 'loss_points' => 1,
            'min_team' => 2, 'min_player_per_team' => 5, 'max_player_per_team' => 12,
        ],
    ], $overrides);
}

test('an organiser can put a roster block on a tournament category', function () {
    $event = Event::factory()->basketball()->create();
    $this->actingAs(organizerOf($event));

    $this->post(route('registration_categories.store', $event), categoryWithBlock(rosterBlockPayload([
        'member_fields' => [['key' => 'asal_sekolah', 'label' => 'Asal Sekolah', 'type' => 'text', 'required' => true]],
    ])))->assertRedirect()->assertSessionHasNoErrors();

    $category = RegistrationCategory::sole();

    expect($category->rosterField()['slots'][0]['role'])->toBe('player')
        ->and($category->rosterMemberFields())->toHaveCount(1)
        ->and($category->inputFields())->toHaveCount(0);
});

test('a roster block is refused on an individual category, and twice on one form', function () {
    $event = Event::factory()->basketball()->create();
    $this->actingAs(organizerOf($event));

    $this->post(route('registration_categories.store', $event), categoryWithBlock(rosterBlockPayload(), [
        'subject_type' => RegistrationCategory::SUBJECT_INDIVIDUAL, 'tournament' => null,
    ]))->assertSessionHasErrors('form_pages');

    $this->post(route('registration_categories.store', $event), categoryWithBlock(rosterBlockPayload(), [
        'form_pages' => [['key' => 'p', 'title' => 'Peserta', 'fields' => [
            rosterBlockPayload(), rosterBlockPayload(['key' => 'roster_2']),
        ]]],
    ]))->assertSessionHasErrors('form_pages');

    expect(RegistrationCategory::count())->toBe(0);
});

test('a roster block is allowed on a team category outside a basketball event', function () {
    $conference = Event::factory()->create(['category' => 'CONFERENCE']);
    $this->actingAs(organizerOf($conference));

    $this->post(route('registration_categories.store', $conference), categoryWithBlock(rosterBlockPayload(), ['tournament' => null]))
        ->assertRedirect()->assertSessionHasNoErrors();

    expect(RegistrationCategory::sole()->rosterField())->not->toBeNull();
});

test('roster block slots and member fields are validated', function () {
    $event = Event::factory()->basketball()->create();
    $this->actingAs(organizerOf($event));

    $this->post(route('registration_categories.store', $event), categoryWithBlock(rosterBlockPayload([
        'slots' => [['role' => 'referee', 'min' => 3, 'max' => 1]],
        'member_fields' => [['key' => 'Bad Key', 'label' => 'x', 'type' => 'signature']],
    ])))->assertSessionHasErrors([
        'form_pages.0.fields.0.slots.0.role',
        'form_pages.0.fields.0.slots.0.max',
        'form_pages.0.fields.0.member_fields.0.key',
        'form_pages.0.fields.0.member_fields.0.type',
    ]);
});
