<?php

use App\Models\Event;
use App\Models\RaceParticipant;
use App\Models\RunningEventCategory;
use App\Services\Running\RaceRankingService;
use Illuminate\Http\UploadedFile;
use Inertia\Testing\AssertableInertia;

function tenK(Event $event): RunningEventCategory
{
    return RunningEventCategory::factory()->create([
        'running_event_id' => $event->eventable_id,
        'name' => '10K',
        'distance_meters' => 10000,
    ]);
}

function runner(RunningEventCategory $distance, string $name, string $bib): RaceParticipant
{
    return RaceParticipant::factory()->create([
        'running_event_category_id' => $distance->id,
        'name' => $name,
        'bib_number' => $bib,
    ]);
}

function resultsCsv(string $contents): UploadedFile
{
    return UploadedFile::fake()->createWithContent('results.csv', $contents);
}

test('a finish time is stored in seconds and shows up in the ranking', function () {
    $event = Event::factory()->running()->create();
    $distance = tenK($event);
    $participant = runner($distance, 'Nadia Putri', '101');
    $user = organizerOf($event);

    $this->actingAs($user)
        ->patch(route('race_results.update', [$event, $distance, $participant]), [
            'status' => RaceParticipant::STATUS_FINISHED,
            'finish_time' => '48:12',
        ])
        ->assertRedirect();

    expect($participant->fresh()->duration_seconds)->toBe(2892)
        ->and($participant->fresh()->status)->toBe(RaceParticipant::STATUS_FINISHED);

    $ranking = app(RaceRankingService::class)->forCategory($distance);

    expect($ranking)->toHaveCount(1)
        ->and($ranking[0]['rank'])->toBe(1)
        ->and($ranking[0]['gap_seconds'])->toBe(0)
        // 2892s over 10 km.
        ->and($ranking[0]['pace_seconds_per_km'])->toBe(289.2);
});

test('hours are understood and a marathon time survives the round trip', function () {
    $event = Event::factory()->running()->create();
    $distance = tenK($event);
    $participant = runner($distance, 'Bagus Wicaksono', '102');
    $user = organizerOf($event);

    $this->actingAs($user)
        ->patch(route('race_results.update', [$event, $distance, $participant]), [
            'status' => RaceParticipant::STATUS_FINISHED,
            'finish_time' => '3:41:07',
        ])
        ->assertRedirect();

    expect($participant->fresh()->duration_seconds)->toBe(13267);
});

test('a finish without a readable time is rejected', function () {
    $event = Event::factory()->running()->create();
    $distance = tenK($event);
    $participant = runner($distance, 'Nadia Putri', '101');
    $user = organizerOf($event);

    $this->actingAs($user)
        ->patch(route('race_results.update', [$event, $distance, $participant]), [
            'status' => RaceParticipant::STATUS_FINISHED,
            'finish_time' => 'quickly',
        ])
        ->assertInvalid('finish_time');

    expect($participant->fresh()->duration_seconds)->toBeNull();
});

test('marking a runner DNF clears any time they had', function () {
    $event = Event::factory()->running()->create();
    $distance = tenK($event);
    $participant = RaceParticipant::factory()->finished(2892)->create([
        'running_event_category_id' => $distance->id,
        'bib_number' => '101',
    ]);
    $user = organizerOf($event);

    $this->actingAs($user)
        ->patch(route('race_results.update', [$event, $distance, $participant]), [
            'status' => RaceParticipant::STATUS_DNF,
            'finish_time' => '48:12',
        ])
        ->assertRedirect();

    expect($participant->fresh()->duration_seconds)->toBeNull()
        ->and($participant->fresh()->status)->toBe(RaceParticipant::STATUS_DNF)
        ->and(app(RaceRankingService::class)->forCategory($distance))->toHaveCount(0)
        ->and(app(RaceRankingService::class)->unrankedFor($distance))->toHaveCount(1);
});

test('the ranking is fastest first, with the gap measured from the winner', function () {
    $event = Event::factory()->running()->create();
    $distance = tenK($event);
    RaceParticipant::factory()->finished(3000)->create([
        'running_event_category_id' => $distance->id, 'name' => 'Third', 'bib_number' => '103',
    ]);
    RaceParticipant::factory()->finished(2400)->create([
        'running_event_category_id' => $distance->id, 'name' => 'First', 'bib_number' => '101',
    ]);
    RaceParticipant::factory()->finished(2700)->create([
        'running_event_category_id' => $distance->id, 'name' => 'Second', 'bib_number' => '102',
    ]);
    // Still out on course: a runner with no time is not ranked last, they are
    // not ranked at all.
    runner($distance, 'Still running', '104');

    $ranking = app(RaceRankingService::class)->forCategory($distance);

    expect($ranking->pluck('name')->all())->toBe(['First', 'Second', 'Third'])
        ->and($ranking->pluck('rank')->all())->toBe([1, 2, 3])
        ->and($ranking->pluck('gap_seconds')->all())->toBe([0, 300, 600]);
});

test('a results file is applied by bib number', function () {
    $event = Event::factory()->running()->create();
    $distance = tenK($event);
    $nadia = runner($distance, 'Nadia Putri', '101');
    $bagus = runner($distance, 'Bagus Wicaksono', '102');
    $user = organizerOf($event);

    $csv = "bib,time,status\n101,48:12,\n102,,DNF\n";

    $this->actingAs($user)
        ->post(route('race_results.import', [$event, $distance]), ['file' => resultsCsv($csv)])
        ->assertRedirect();

    expect($nadia->fresh()->duration_seconds)->toBe(2892)
        ->and($nadia->fresh()->status)->toBe(RaceParticipant::STATUS_FINISHED)
        ->and($bagus->fresh()->status)->toBe(RaceParticipant::STATUS_DNF)
        ->and($bagus->fresh()->duration_seconds)->toBeNull();
});

test('an import reports the rows it could not apply and keeps the rest', function () {
    $event = Event::factory()->running()->create();
    $distance = tenK($event);
    $nadia = runner($distance, 'Nadia Putri', '101');
    runner($distance, 'Bagus Wicaksono', '102');
    $user = organizerOf($event);

    $csv = "Bib Number,Finish Time\n101,48:12\n999,50:00\n102,not-a-time\n";

    $this->actingAs($user)
        ->post(route('race_results.import', [$event, $distance]), ['file' => resultsCsv($csv)])
        ->assertRedirect()
        ->assertSessionHas('import_errors', function (array $errors) {
            return count($errors) === 2
                && str_contains($errors[0], '999')
                && str_contains($errors[1], 'not-a-time');
        });

    // The good row still landed, which is the whole point of not throwing.
    expect($nadia->fresh()->duration_seconds)->toBe(2892);
});

test('an import needs a bib column and a time column', function () {
    $event = Event::factory()->running()->create();
    $distance = tenK($event);
    $user = organizerOf($event);

    $this->actingAs($user)
        ->post(route('race_results.import', [$event, $distance]), [
            'file' => resultsCsv("runner,place\nNadia,1\n"),
        ])
        ->assertRedirect()
        ->assertSessionHas('import_errors', fn (array $errors) => count($errors) === 1);
});

test('a bib belonging to another distance is not matched', function () {
    $event = Event::factory()->running()->create();
    $tenK = tenK($event);
    $fiveK = RunningEventCategory::factory()->create([
        'running_event_id' => $event->eventable_id,
        'name' => '5K',
        'distance_meters' => 5000,
    ]);
    $otherRunner = runner($fiveK, 'Different Distance', '101');
    $user = organizerOf($event);

    $this->actingAs($user)
        ->post(route('race_results.import', [$event, $tenK]), [
            'file' => resultsCsv("bib,time\n101,48:12\n"),
        ])
        ->assertRedirect();

    expect($otherRunner->fresh()->duration_seconds)->toBeNull();
});

test('results can be exported as a csv', function () {
    $event = Event::factory()->running()->create();
    $distance = tenK($event);
    RaceParticipant::factory()->finished(2892)->create([
        'running_event_category_id' => $distance->id,
        'name' => 'Nadia Putri',
        'bib_number' => '101',
    ]);
    $user = organizerOf($event);

    $response = $this->actingAs($user)
        ->get(route('race_results.export', [$event, $distance]))
        ->assertOk()
        ->assertDownload('10k-results.csv');

    expect($response->streamedContent())
        ->toContain('Rank,Bib,Name,Status,Time')
        ->toContain('1,101,"Nadia Putri",finished,48:12');
});

test('the results page shows the leaderboard to an organizer', function () {
    $event = Event::factory()->running()->create();
    $distance = tenK($event);
    RaceParticipant::factory()->finished(2892)->create([
        'running_event_category_id' => $distance->id,
        'name' => 'Nadia Putri',
        'bib_number' => '101',
    ]);
    $user = organizerOf($event);

    $this->actingAs($user)
        ->get(route('race_results.index', [$event, $distance]))
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->component('dashboard/events/running/results/index')
            ->has('rankings', 1)
            ->where('rankings.0.name', 'Nadia Putri')
            ->where('results_published', false)
        );
});

test('guests cannot read or write results', function () {
    $event = Event::factory()->running()->create();
    $distance = tenK($event);
    $participant = runner($distance, 'Nadia Putri', '101');

    $this->get(route('race_results.index', [$event, $distance]))->assertRedirect(route('login'));
    $this->get(route('race_results.export', [$event, $distance]))->assertRedirect(route('login'));
    $this->patch(route('race_results.update', [$event, $distance, $participant]), [
        'status' => RaceParticipant::STATUS_FINISHED,
        'finish_time' => '48:12',
    ])->assertRedirect(route('login'));

    expect($participant->fresh()->duration_seconds)->toBeNull();
});
