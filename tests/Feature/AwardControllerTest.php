<?php

use App\Models\Award;
use App\Models\AwardNominee;
use App\Models\Event;
use App\Models\Organization;
use App\Models\Team;
use App\Models\Vote;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

/**
 * @return array<string, mixed>
 */
function awardPayload(array $overrides = []): array
{
    return array_merge([
        'title' => 'Most Valuable Player',
        'description' => 'The standout performer of the tournament.',
        'nominee_kind' => Award::NOMINEE_KIND_TEAM,
        'allowed_voters' => [Award::VOTER_PUBLIC],
        'status' => Award::STATUS_DRAFT,
        'results_visibility' => Award::RESULTS_AFTER_CLOSE,
        'is_paid' => false,
        'price_per_vote' => null,
        'max_votes_per_transaction' => null,
        'max_votes_per_voter' => null,
        'opens_at' => null,
        'closes_at' => null,
    ], $overrides);
}

test('an organizer can create an award for their event', function () {
    $event = Event::factory()->create();

    $this->actingAs(organizerOf($event))
        ->post(route('awards.store', $event), awardPayload())
        ->assertRedirect();

    $award = Award::where('event_id', $event->id)->firstOrFail();

    expect($award->title)->toBe('Most Valuable Player')
        ->and($award->status)->toBe(Award::STATUS_DRAFT)
        ->and($award->allowed_voters)->toBe([Award::VOTER_PUBLIC])
        ->and($award->is_paid)->toBeFalse();
});

test('a paid award must carry a price per vote', function () {
    $event = Event::factory()->create();

    $this->actingAs(organizerOf($event))
        ->post(route('awards.store', $event), awardPayload([
            'is_paid' => true,
            'price_per_vote' => null,
        ]))
        ->assertSessionHasErrors('price_per_vote');

    expect(Award::count())->toBe(0);
});

test('voting cannot be scheduled to close before it opens', function () {
    $event = Event::factory()->create();

    $this->actingAs(organizerOf($event))
        ->post(route('awards.store', $event), awardPayload([
            'opens_at' => now()->addDay()->toDateTimeString(),
            'closes_at' => now()->toDateTimeString(),
        ]))
        ->assertSessionHasErrors('closes_at');
});

test('an award belonging to another organization is not reachable', function () {
    $event = Event::factory()->create();
    $award = Award::factory()->create(['event_id' => $event->id]);

    $outsider = memberOf(Organization::factory()->create());

    $this->actingAs($outsider)
        ->get(route('awards.show', [$event, $award]))
        ->assertNotFound();
});

test('an award cannot be shown through an event it does not belong to', function () {
    $event = Event::factory()->create();
    $otherEvent = Event::factory()->create(['organization_id' => $event->organization_id]);
    $award = Award::factory()->create(['event_id' => $otherEvent->id]);

    $this->actingAs(organizerOf($event))
        ->get(route('awards.show', [$event, $award]))
        ->assertNotFound();
});

test('the results page shows tallies to the organizer even while they are hidden from voters', function () {
    $event = Event::factory()->create();
    $award = Award::factory()->open()->create(['event_id' => $event->id]);
    $team = Team::factory()->create(['event_id' => $event->id]);
    $nominee = AwardNominee::factory()->of($team)->create(['award_id' => $award->id]);

    Vote::factory()->onNominee($nominee)->count(3)->create();
    Vote::factory()->onNominee($nominee)->pending()->create(['quantity' => 5]);

    // Hidden from voters until close...
    expect($award->resultsArePublic())->toBeFalse();

    // ...but the organizer sees them regardless.
    $this->actingAs(organizerOf($event))
        ->get(route('awards.show', [$event, $award]))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('dashboard/events/awards/show')
            ->where('nominees.0.votes_total', 3)
            ->where('stats.votes_counted', 3)
            // A pending paid batch is money not yet settled, so it is reported
            // separately and never folded into the tally.
            ->where('stats.votes_pending', 5)
        );
});

test('pricing can no longer be changed once votes have been cast', function () {
    $event = Event::factory()->create();
    $award = Award::factory()->open()->create(['event_id' => $event->id]);
    $nominee = AwardNominee::factory()
        ->of(Team::factory()->create(['event_id' => $event->id]))
        ->create(['award_id' => $award->id]);

    Vote::factory()->onNominee($nominee)->create();

    $this->actingAs(organizerOf($event))
        ->put(route('awards.update', [$event, $award]), awardPayload([
            'status' => Award::STATUS_OPEN,
            'is_paid' => true,
            'price_per_vote' => 5000,
        ]))
        ->assertRedirect();

    expect($award->fresh()->is_paid)->toBeFalse();
});

test('an award with votes cannot be deleted', function () {
    $event = Event::factory()->create();
    $award = Award::factory()->open()->create(['event_id' => $event->id]);
    $nominee = AwardNominee::factory()
        ->of(Team::factory()->create(['event_id' => $event->id]))
        ->create(['award_id' => $award->id]);

    Vote::factory()->onNominee($nominee)->create();

    $this->actingAs(organizerOf($event))
        ->delete(route('awards.destroy', [$event, $award]))
        ->assertRedirect();

    expect(Award::whereKey($award->id)->exists())->toBeTrue();
});

test('an award without votes can be deleted', function () {
    $event = Event::factory()->create();
    $award = Award::factory()->create(['event_id' => $event->id]);

    $this->actingAs(organizerOf($event))
        ->delete(route('awards.destroy', [$event, $award]))
        ->assertRedirect(route('awards.index', $event));

    expect(Award::whereKey($award->id)->exists())->toBeFalse();
});

test('an organizer can put a team on the ballot', function () {
    $event = Event::factory()->create();
    $award = Award::factory()->create(['event_id' => $event->id]);
    $team = Team::factory()->create(['event_id' => $event->id]);

    $this->actingAs(organizerOf($event))
        ->post(route('awards.nominees.store', [$event, $award]), ['nominee_id' => $team->id])
        ->assertRedirect();

    $nominee = $award->nominees()->firstOrFail();

    expect($nominee->nominee_type)->toBe(Team::class)
        ->and($nominee->nominee_id)->toBe($team->id)
        // With no override, the ballot label is the team's own name.
        ->and($nominee->name)->toBe($team->name);
});

test('a team from another event cannot be nominated', function () {
    $event = Event::factory()->create();
    $award = Award::factory()->create(['event_id' => $event->id]);
    $foreignTeam = Team::factory()->create();

    $this->actingAs(organizerOf($event))
        ->post(route('awards.nominees.store', [$event, $award]), ['nominee_id' => $foreignTeam->id])
        ->assertSessionHasErrors('nominee_id');

    expect($award->nominees()->count())->toBe(0);
});

test('the same team cannot be nominated twice for one award', function () {
    $event = Event::factory()->create();
    $award = Award::factory()->create(['event_id' => $event->id]);
    $team = Team::factory()->create(['event_id' => $event->id]);

    $organizer = organizerOf($event);

    $this->actingAs($organizer)
        ->post(route('awards.nominees.store', [$event, $award]), ['nominee_id' => $team->id]);
    $this->actingAs($organizer)
        ->post(route('awards.nominees.store', [$event, $award]), ['nominee_id' => $team->id]);

    expect($award->nominees()->count())->toBe(1);
});

test('a nominee with votes cannot be removed from the ballot', function () {
    $event = Event::factory()->create();
    $award = Award::factory()->open()->create(['event_id' => $event->id]);
    $nominee = AwardNominee::factory()
        ->of(Team::factory()->create(['event_id' => $event->id]))
        ->create(['award_id' => $award->id]);

    Vote::factory()->onNominee($nominee)->create();

    $this->actingAs(organizerOf($event))
        ->delete(route('awards.nominees.destroy', [$event, $award, $nominee]))
        ->assertRedirect();

    expect(AwardNominee::whereKey($nominee->id)->exists())->toBeTrue();
});
