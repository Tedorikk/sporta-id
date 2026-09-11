<?php

namespace App\Http\Controllers;

use App\Models\Event;
use App\Models\RaceParticipant;
use App\Models\RunningEvent;
use App\Models\RunningEventCategory;
use App\Services\Running\RaceRankingService;
use App\Services\Running\RaceResultImporter;
use App\Services\Running\RaceTime;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

class RaceResultController extends Controller
{
    public function __construct(
        private RaceRankingService $rankings,
        private RaceResultImporter $importer,
    ) {}

    public function index(Event $event, RunningEventCategory $category)
    {
        $this->authorizeCategory($event, $category);

        return Inertia::render('dashboard/events/running/results/index', [
            'event' => $event->only(['id', 'name', 'category']),
            'category' => $category,
            'results_published' => $event->specific->results_published,
            'participants' => $category->participants()
                ->orderByRaw('bib_number is null desc')
                ->orderBy('bib_number')
                ->orderBy('id')
                ->get(),
            'rankings' => $this->rankings->forCategory($category),
            'unranked' => $this->rankings->unrankedFor($category),
        ]);
    }

    public function update(Request $request, Event $event, RunningEventCategory $category, RaceParticipant $participant)
    {
        $this->authorizeCategory($event, $category);
        abort_unless($participant->running_event_category_id === $category->id, 404);

        $validated = $request->validate([
            'status' => ['required', Rule::in(RaceParticipant::STATUSES)],
            // Typed the way a stopwatch reads: "48:12" or "3:41:07".
            'finish_time' => ['nullable', 'string', 'max:20'],
        ]);

        $seconds = RaceTime::parse($validated['finish_time'] ?? null);

        if ($validated['status'] === RaceParticipant::STATUS_FINISHED && $seconds === null) {
            return back()->withErrors([
                'finish_time' => 'Enter a finish time like 48:12 or 3:41:07.',
            ]);
        }

        $participant->update([
            'status' => $validated['status'],
            'duration_seconds' => $validated['status'] === RaceParticipant::STATUS_FINISHED ? $seconds : null,
        ]);

        return redirect()->back()->with(['toast' => [
            'title' => 'Success',
            'description' => 'Result saved.',
        ]]);
    }

    public function import(Request $request, Event $event, RunningEventCategory $category)
    {
        $this->authorizeCategory($event, $category);

        $request->validate([
            'file' => ['required', 'file', 'mimes:csv,txt', 'max:5120'],
        ]);

        ['updated' => $updated, 'skipped' => $skipped, 'errors' => $errors] = $this->importer
            ->import($category, $request->file('file'));

        return redirect()->back()->with([
            'toast' => [
                'title' => $updated > 0 ? 'Success' : 'Error',
                'description' => "{$updated} result(s) imported, {$skipped} row(s) skipped.",
                'variant' => $updated > 0 ? null : 'destructive',
            ],
            'import_errors' => $errors,
        ]);
    }

    public function export(Event $event, RunningEventCategory $category)
    {
        $this->authorizeCategory($event, $category);

        $filename = Str::slug($category->name).'-results.csv';
        $rankByParticipant = $this->rankings->forCategory($category)
            ->pluck('rank', 'participant_id');

        return response()->streamDownload(function () use ($category, $rankByParticipant) {
            $handle = fopen('php://output', 'w');

            fputcsv($handle, ['Rank', 'Bib', 'Name', 'Status', 'Time'], escape: '');

            $category->participants()
                ->orderBy('id')
                ->chunk(200, function ($participants) use ($handle, $rankByParticipant) {
                    foreach ($participants as $participant) {
                        fputcsv($handle, [
                            $rankByParticipant[$participant->id] ?? '',
                            $participant->bib_number,
                            $participant->name,
                            $participant->status,
                            RaceTime::format($participant->duration_seconds),
                        ], escape: '');
                    }
                });

            fclose($handle);
        }, $filename, ['Content-Type' => 'text/csv']);
    }

    private function authorizeCategory(Event $event, RunningEventCategory $category): void
    {
        abort_unless($event->specific instanceof RunningEvent, 404);
        abort_unless($category->running_event_id === $event->eventable_id, 404);
    }
}
