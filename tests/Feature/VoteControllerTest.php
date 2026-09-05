<?php

use App\Models\Attendee;
use App\Models\Award;
use App\Models\AwardNominee;
use App\Models\Event;
use App\Models\Payment;
use App\Models\Registration;
use App\Models\RegistrationCategory;
use App\Models\Team;
use App\Models\Vote;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;

uses(RefreshDatabase::class);

beforeEach(function () {
    config(['services.midtrans.server_key' => 'test-server-key']);
});

/**
 * A published event with an open award and one nominee on the ballot.
 *
 * @return array{event: Event, award: Award, nominee: AwardNominee}
 */
function ballot(array $awardState = []): array
{
    $event = Event::factory()->create(['is_published' => true]);

    $award = Award::factory()->open()->create([
        'event_id' => $event->id,
        ...$awardState,
    ]);

    $nominee = AwardNominee::factory()
        ->of(Team::factory()->create(['event_id' => $event->id]))
        ->create(['award_id' => $award->id]);

    return compact('event', 'award', 'nominee');
}

function confirmedRegistrant(Event $event, string $status = Registration::STATUS_CONFIRMED): Registration
{
    $category = RegistrationCategory::create([
        'event_id' => $event->id,
        'name' => 'General',
        'subject_type' => RegistrationCategory::SUBJECT_INDIVIDUAL,
        'price' => '0',
        'registration_open' => true,
        'registered_count' => 0,
        'form_pages' => [],
    ]);

    return Registration::create([
        'registration_category_id' => $category->id,
        'event_id' => $event->id,
        'name' => 'Jane Voter',
        'email' => 'jane@example.com',
        'status' => $status,
    ]);
}

function eventAttendee(Event $event): Attendee
{
    return Attendee::create([
        'event_id' => $event->id,
        // Every event is seeded with default attendee types on creation.
        'attendee_type_id' => $event->attendeeTypes()->firstOrFail()->id,
        'name' => 'Percy Photographer',
    ]);
}

function signedVoteNotification(Payment $payment, string $status): array
{
    $statusCode = '200';

    return [
        'order_id' => $payment->order_id,
        'status_code' => $statusCode,
        'gross_amount' => $payment->amount,
        'transaction_status' => $status,
        'transaction_id' => 'txn-vote-1',
        'payment_type' => 'qris',
        'signature_key' => hash('sha512', $payment->order_id.$statusCode.$payment->amount.config('services.midtrans.server_key')),
    ];
}

// --- Visibility -------------------------------------------------------------

test('a draft award is not publicly reachable', function () {
    ['event' => $event, 'award' => $award] = ballot();
    $award->update(['status' => Award::STATUS_DRAFT]);

    $this->get(route('votes.create', [$event, $award]))->assertNotFound();
});

test('an award on an unpublished event is not publicly reachable', function () {
    ['event' => $event, 'award' => $award] = ballot();
    $event->update(['is_published' => false]);

    $this->get(route('votes.create', [$event, $award]))->assertNotFound();
});

test('an award cannot be reached through an event it does not belong to', function () {
    ['award' => $award] = ballot();
    $otherEvent = Event::factory()->create(['is_published' => true]);

    $this->get(route('votes.create', [$otherEvent, $award]))->assertNotFound();
});

// --- Free voting ------------------------------------------------------------

test('anyone can cast a free vote on a public award', function () {
    ['event' => $event, 'award' => $award, 'nominee' => $nominee] = ballot();

    $this->post(route('votes.store', [$event, $award]), [
        'award_nominee_id' => $nominee->id,
        'quantity' => 1,
    ])->assertRedirect();

    $vote = Vote::firstOrFail();

    expect($vote->status)->toBe(Vote::STATUS_COUNTED)
        ->and($vote->quantity)->toBe(1)
        ->and($vote->amount)->toBeNull()
        ->and($vote->voter_id)->toBeNull();
});

test('the same browser cannot vote twice on a free award', function () {
    ['event' => $event, 'award' => $award, 'nominee' => $nominee] = ballot();

    $payload = ['award_nominee_id' => $nominee->id, 'quantity' => 1];

    $this->post(route('votes.store', [$event, $award]), $payload)->assertRedirect();
    $this->post(route('votes.store', [$event, $award]), $payload)
        ->assertSessionHasErrors('award_nominee_id');

    expect(Vote::count())->toBe(1);
});

test('a free award ignores an attempt to buy a batch of votes', function () {
    ['event' => $event, 'award' => $award, 'nominee' => $nominee] = ballot();

    $this->post(route('votes.store', [$event, $award]), [
        'award_nominee_id' => $nominee->id,
        'quantity' => 50,
    ])->assertSessionHasErrors('quantity');

    expect(Vote::count())->toBe(0);
});

test('a vote for a nominee on another ballot is rejected', function () {
    ['event' => $event, 'award' => $award] = ballot();
    ['nominee' => $foreignNominee] = ballot();

    $this->post(route('votes.store', [$event, $award]), [
        'award_nominee_id' => $foreignNominee->id,
        'quantity' => 1,
    ])->assertSessionHasErrors('award_nominee_id');
});

test('the honeypot field rejects a bot submission', function () {
    ['event' => $event, 'award' => $award, 'nominee' => $nominee] = ballot();

    $this->post(route('votes.store', [$event, $award]), [
        'award_nominee_id' => $nominee->id,
        'quantity' => 1,
        'website' => 'http://spam.example',
    ])->assertSessionHasErrors('website');

    expect(Vote::count())->toBe(0);
});

test('a closed award accepts no votes', function () {
    ['event' => $event, 'award' => $award, 'nominee' => $nominee] = ballot();
    $award->update(['status' => Award::STATUS_CLOSED]);

    $this->post(route('votes.store', [$event, $award]), [
        'award_nominee_id' => $nominee->id,
        'quantity' => 1,
    ])->assertSessionHasErrors('award_nominee_id');

    expect(Vote::count())->toBe(0);
});

test('an award whose scheduled window has passed accepts no votes', function () {
    ['event' => $event, 'award' => $award, 'nominee' => $nominee] = ballot([
        'opens_at' => now()->subDays(2),
        'closes_at' => now()->subDay(),
    ]);

    $this->post(route('votes.store', [$event, $award]), [
        'award_nominee_id' => $nominee->id,
        'quantity' => 1,
    ])->assertSessionHasErrors('award_nominee_id');
});

// --- Identified voters ------------------------------------------------------

test('an award limited to registrants turns away an anonymous voter', function () {
    ['event' => $event, 'award' => $award, 'nominee' => $nominee] = ballot([
        'allowed_voters' => [Award::VOTER_REGISTRANT],
    ]);

    $this->post(route('votes.store', [$event, $award]), [
        'award_nominee_id' => $nominee->id,
        'quantity' => 1,
    ])->assertSessionHasErrors('voter_token');

    expect(Vote::count())->toBe(0);
});

test('a confirmed registrant can vote with the token from their ID card', function () {
    ['event' => $event, 'award' => $award, 'nominee' => $nominee] = ballot([
        'allowed_voters' => [Award::VOTER_REGISTRANT],
    ]);
    $registration = confirmedRegistrant($event);

    $this->post(route('votes.store', [$event, $award]), [
        'award_nominee_id' => $nominee->id,
        'quantity' => 1,
        'voter_token' => $registration->qr_token,
    ])->assertRedirect();

    $vote = Vote::firstOrFail();

    expect($vote->voter_type)->toBe(Registration::class)
        ->and($vote->voter_id)->toBe($registration->id)
        ->and($vote->status)->toBe(Vote::STATUS_COUNTED);
});

test('a registration still awaiting payment cannot vote', function () {
    ['event' => $event, 'award' => $award, 'nominee' => $nominee] = ballot([
        'allowed_voters' => [Award::VOTER_REGISTRANT],
    ]);
    $registration = confirmedRegistrant($event, Registration::STATUS_PENDING_PAYMENT);

    $this->post(route('votes.store', [$event, $award]), [
        'award_nominee_id' => $nominee->id,
        'quantity' => 1,
        'voter_token' => $registration->qr_token,
    ])->assertSessionHasErrors('voter_token');
});

test('an attendee badge is turned away from a registrants-only award', function () {
    ['event' => $event, 'award' => $award, 'nominee' => $nominee] = ballot([
        'allowed_voters' => [Award::VOTER_REGISTRANT],
    ]);
    $attendee = eventAttendee($event);

    $this->post(route('votes.store', [$event, $award]), [
        'award_nominee_id' => $nominee->id,
        'quantity' => 1,
        'voter_token' => $attendee->qr_token,
    ])->assertSessionHasErrors('voter_token');
});

test('an attendee can vote when the award admits attendees', function () {
    ['event' => $event, 'award' => $award, 'nominee' => $nominee] = ballot([
        'allowed_voters' => [Award::VOTER_REGISTRANT, Award::VOTER_ATTENDEE],
    ]);
    $attendee = eventAttendee($event);

    $this->post(route('votes.store', [$event, $award]), [
        'award_nominee_id' => $nominee->id,
        'quantity' => 1,
        'voter_token' => $attendee->qr_token,
    ])->assertRedirect();

    expect(Vote::firstOrFail()->voter_type)->toBe(Attendee::class);
});

test('a revoked attendee badge cannot vote', function () {
    ['event' => $event, 'award' => $award, 'nominee' => $nominee] = ballot([
        'allowed_voters' => [Award::VOTER_ATTENDEE],
    ]);
    $attendee = eventAttendee($event);
    $attendee->update(['status' => Attendee::STATUS_REVOKED]);

    $this->post(route('votes.store', [$event, $award]), [
        'award_nominee_id' => $nominee->id,
        'quantity' => 1,
        'voter_token' => $attendee->qr_token,
    ])->assertSessionHasErrors('voter_token');
});

test('a token from another event cannot vote', function () {
    ['event' => $event, 'award' => $award, 'nominee' => $nominee] = ballot([
        'allowed_voters' => [Award::VOTER_REGISTRANT],
    ]);
    $foreign = confirmedRegistrant(Event::factory()->create(['is_published' => true]));

    $this->post(route('votes.store', [$event, $award]), [
        'award_nominee_id' => $nominee->id,
        'quantity' => 1,
        'voter_token' => $foreign->qr_token,
    ])->assertSessionHasErrors('voter_token');
});

test('one registrant cannot vote twice in the same award', function () {
    ['event' => $event, 'award' => $award, 'nominee' => $nominee] = ballot([
        'allowed_voters' => [Award::VOTER_REGISTRANT],
    ]);
    $registration = confirmedRegistrant($event);

    $payload = [
        'award_nominee_id' => $nominee->id,
        'quantity' => 1,
        'voter_token' => $registration->qr_token,
    ];

    $this->post(route('votes.store', [$event, $award]), $payload)->assertRedirect();
    $this->post(route('votes.store', [$event, $award]), $payload)
        ->assertSessionHasErrors('award_nominee_id');

    expect(Vote::count())->toBe(1);
});

test('a registrant may vote up to the per-voter cap', function () {
    ['event' => $event, 'award' => $award, 'nominee' => $nominee] = ballot([
        'allowed_voters' => [Award::VOTER_REGISTRANT],
        'max_votes_per_voter' => 2,
    ]);
    $registration = confirmedRegistrant($event);

    $payload = [
        'award_nominee_id' => $nominee->id,
        'quantity' => 1,
        'voter_token' => $registration->qr_token,
    ];

    $this->post(route('votes.store', [$event, $award]), $payload)->assertRedirect();
    $this->post(route('votes.store', [$event, $award]), $payload)->assertRedirect();
    $this->post(route('votes.store', [$event, $award]), $payload)
        ->assertSessionHasErrors('award_nominee_id');

    expect(Vote::count())->toBe(2);
});

// --- Results visibility -----------------------------------------------------

test('tallies stay hidden from voters until the award closes', function () {
    ['event' => $event, 'award' => $award, 'nominee' => $nominee] = ballot();
    Vote::factory()->onNominee($nominee)->count(4)->create();

    $this->get(route('votes.create', [$event, $award]))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('vote')
            ->where('award.results_are_public', false)
            ->where('nominees.0.votes_total', null)
        );

    $award->update(['status' => Award::STATUS_CLOSED]);

    $this->get(route('votes.create', [$event, $award]))
        ->assertInertia(fn ($page) => $page
            ->where('award.results_are_public', true)
            ->where('nominees.0.votes_total', 4)
        );
});

test('an award set to live results shows tallies while voting is open', function () {
    ['event' => $event, 'award' => $award, 'nominee' => $nominee] = ballot([
        'results_visibility' => Award::RESULTS_LIVE,
    ]);
    Vote::factory()->onNominee($nominee)->count(2)->create();

    $this->get(route('votes.create', [$event, $award]))
        ->assertInertia(fn ($page) => $page->where('nominees.0.votes_total', 2));
});

test('pending paid votes are never included in a tally', function () {
    ['event' => $event, 'award' => $award, 'nominee' => $nominee] = ballot([
        'results_visibility' => Award::RESULTS_LIVE,
    ]);
    Vote::factory()->onNominee($nominee)->create();
    Vote::factory()->onNominee($nominee)->pending()->create(['quantity' => 99]);
    Vote::factory()->onNominee($nominee)->void()->create(['quantity' => 99]);

    $this->get(route('votes.create', [$event, $award]))
        ->assertInertia(fn ($page) => $page->where('nominees.0.votes_total', 1));
});

// --- Paid voting ------------------------------------------------------------

test('a paid vote is created pending and does not count until it settles', function () {
    ['event' => $event, 'award' => $award, 'nominee' => $nominee] = ballot([
        'is_paid' => true,
        'price_per_vote' => 5000,
    ]);

    $this->post(route('votes.store', [$event, $award]), [
        'award_nominee_id' => $nominee->id,
        'quantity' => 10,
        'voter_name' => 'Big Fan',
        'voter_email' => 'fan@example.com',
    ])->assertRedirect();

    $vote = Vote::firstOrFail();

    expect($vote->status)->toBe(Vote::STATUS_PENDING)
        ->and($vote->quantity)->toBe(10)
        ->and($vote->amount)->toBe(50000)
        ->and($award->votes()->counted()->sum('quantity'))->toBe(0);
});

test('a paid vote needs a payer name and email', function () {
    ['event' => $event, 'award' => $award, 'nominee' => $nominee] = ballot([
        'is_paid' => true,
        'price_per_vote' => 5000,
    ]);

    $this->post(route('votes.store', [$event, $award]), [
        'award_nominee_id' => $nominee->id,
        'quantity' => 1,
    ])->assertSessionHasErrors(['voter_name', 'voter_email']);
});

test('a paid award refuses a batch larger than its per-transaction cap', function () {
    ['event' => $event, 'award' => $award, 'nominee' => $nominee] = ballot([
        'is_paid' => true,
        'price_per_vote' => 5000,
        'max_votes_per_transaction' => 20,
    ]);

    $this->post(route('votes.store', [$event, $award]), [
        'award_nominee_id' => $nominee->id,
        'quantity' => 21,
        'voter_name' => 'Big Fan',
        'voter_email' => 'fan@example.com',
    ])->assertSessionHasErrors('quantity');
});

test('paying a pending vote returns a snap token for the full batch', function () {
    Http::fake([
        'app.sandbox.midtrans.com/snap/v1/transactions' => Http::response(['token' => 'snap-vote-token'], 201),
    ]);

    ['award' => $award, 'nominee' => $nominee] = ballot([
        'is_paid' => true,
        'price_per_vote' => 5000,
    ]);

    $vote = Vote::factory()->onNominee($nominee)->pending()->paid(4)->create();

    $this->postJson(route('votes.pay', $vote))
        ->assertOk()
        ->assertJson(['snap_token' => 'snap-vote-token']);

    $payment = $vote->payments()->firstOrFail();

    expect($payment->snap_token)->toBe('snap-vote-token')
        ->and((float) $payment->amount)->toBe(20000.0);

    Http::assertSent(function ($request) use ($payment, $award) {
        $data = $request->data();
        $item = $data['item_details'][0] ?? [];

        return ($data['transaction_details']['order_id'] ?? null) === $payment->order_id
            && ($data['transaction_details']['gross_amount'] ?? null) === 20000
            // The payer must see what they are buying on Midtrans's own page,
            // not just an order id: 4 votes at 5,000 each.
            && ($item['quantity'] ?? null) === 4
            && ($item['price'] ?? null) === 5000
            && str_contains($item['name'] ?? '', $award->title);
    });
});

test('a settled notification counts the whole batch of paid votes', function () {
    ['award' => $award, 'nominee' => $nominee] = ballot([
        'is_paid' => true,
        'price_per_vote' => 5000,
    ]);

    $vote = Vote::factory()->onNominee($nominee)->pending()->paid(7)->create();
    $payment = $vote->payments()->create(['order_id' => 'VOTE-1-ABC123', 'amount' => 35000]);

    $this->postJson(route('webhooks.midtrans'), signedVoteNotification($payment, 'settlement'))
        ->assertOk();

    expect($vote->fresh()->status)->toBe(Vote::STATUS_COUNTED)
        ->and($payment->fresh()->status)->toBe(Payment::STATUS_SETTLEMENT)
        ->and($payment->fresh()->paid_at)->not->toBeNull()
        ->and($award->votes()->counted()->sum('quantity'))->toBe(7);
});

test('an expired notification voids the paid votes so they never count', function () {
    ['award' => $award, 'nominee' => $nominee] = ballot([
        'is_paid' => true,
        'price_per_vote' => 5000,
    ]);

    $vote = Vote::factory()->onNominee($nominee)->pending()->paid(7)->create();
    $payment = $vote->payments()->create(['order_id' => 'VOTE-2-DEF456', 'amount' => 35000]);

    $this->postJson(route('webhooks.midtrans'), signedVoteNotification($payment, 'expire'))
        ->assertOk();

    expect($vote->fresh()->status)->toBe(Vote::STATUS_VOID)
        ->and($award->votes()->counted()->sum('quantity'))->toBe(0);
});

test('a replayed settlement notification does not count the batch twice', function () {
    ['award' => $award, 'nominee' => $nominee] = ballot([
        'is_paid' => true,
        'price_per_vote' => 5000,
    ]);

    $vote = Vote::factory()->onNominee($nominee)->pending()->paid(3)->create();
    $payment = $vote->payments()->create(['order_id' => 'VOTE-3-GHI789', 'amount' => 15000]);

    $notification = signedVoteNotification($payment, 'settlement');

    $this->postJson(route('webhooks.midtrans'), $notification)->assertOk();
    $this->postJson(route('webhooks.midtrans'), $notification)->assertOk();

    expect($award->votes()->counted()->sum('quantity'))->toBe(3);
});

test('an already settled vote is not voided by a later expire notification', function () {
    ['nominee' => $nominee] = ballot(['is_paid' => true, 'price_per_vote' => 5000]);

    $vote = Vote::factory()->onNominee($nominee)->pending()->paid(3)->create();
    $payment = $vote->payments()->create(['order_id' => 'VOTE-4-JKL012', 'amount' => 15000]);

    $this->postJson(route('webhooks.midtrans'), signedVoteNotification($payment, 'settlement'))->assertOk();
    $this->postJson(route('webhooks.midtrans'), signedVoteNotification($payment, 'expire'))->assertOk();

    expect($vote->fresh()->status)->toBe(Vote::STATUS_COUNTED);
});

test('a vote that is not awaiting payment cannot be paid for', function () {
    ['nominee' => $nominee] = ballot(['is_paid' => true, 'price_per_vote' => 5000]);

    $vote = Vote::factory()->onNominee($nominee)->paid(2)->create();

    $this->postJson(route('votes.pay', $vote))->assertForbidden();
});
