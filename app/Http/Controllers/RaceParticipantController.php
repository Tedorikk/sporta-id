<?php

namespace App\Http\Controllers;

use App\Models\Event;
use App\Models\RaceParticipant;
use App\Models\RunningEvent;
use App\Models\RunningEventCategory;
use App\Services\Running\BibNumberAssigner;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

class RaceParticipantController extends Controller
{
    public function __construct(private BibNumberAssigner $bibs) {}

    public function index(Request $request, Event $event, RunningEventCategory $category)
    {
        $this->authorizeCategory($event, $category);

        $search = $request->input('search') ?: null;

        $participants = $category->participants()
            ->when($search, fn ($query) => $query->where(fn ($q) => $q
                ->where('name', 'like', "%{$search}%")
                ->orWhere('bib_number', 'like', "%{$search}%")
            ))
            // Unnumbered runners first: they are the ones still needing action.
            ->orderByRaw('bib_number is null desc')
            ->orderBy('bib_number')
            ->orderBy('id')
            ->get();

        return Inertia::render('dashboard/events/running/participants/index', [
            'event' => $event->only(['id', 'name', 'category']),
            'category' => $category->load('registrationCategory:id,name'),
            'participants' => $participants,
            'filters' => ['search' => $search],
            'summary' => [
                'total' => $category->participants()->count(),
                'unnumbered' => $category->participants()->whereNull('bib_number')->count(),
                'finished' => $category->participants()->finishers()->count(),
            ],
            'next_bib' => $this->bibs->nextAvailable($category),
        ]);
    }

    public function store(Request $request, Event $event, RunningEventCategory $category)
    {
        $this->authorizeCategory($event, $category);

        $validated = $request->validate($this->rules($category));

        $category->participants()->create($validated);

        return redirect()->back()->with(['toast' => [
            'title' => 'Success',
            'description' => 'Runner added to the start list.',
        ]]);
    }

    public function update(Request $request, Event $event, RunningEventCategory $category, RaceParticipant $participant)
    {
        $this->authorizeParticipant($category, $participant);

        $validated = $request->validate($this->rules($category, $participant));

        $participant->update($validated);

        return redirect()->back()->with(['toast' => [
            'title' => 'Success',
            'description' => 'Runner updated.',
        ]]);
    }

    public function destroy(Event $event, RunningEventCategory $category, RaceParticipant $participant)
    {
        $this->authorizeParticipant($category, $participant);

        $participant->delete();

        return redirect()->back()->with(['toast' => [
            'title' => 'Success',
            'description' => 'Runner removed from the start list.',
        ]]);
    }

    /**
     * @return array<string, array<int, mixed>>
     */
    private function rules(RunningEventCategory $category, ?RaceParticipant $participant = null): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'email' => ['nullable', 'email', 'max:255'],
            'phone' => ['nullable', 'string', 'max:255'],
            // A bib identifies a runner to the timing crew, so it has to be
            // unique within the distance it was handed out for.
            'bib_number' => [
                'nullable', 'string', 'max:255',
                Rule::unique('race_participants')
                    ->where('running_event_category_id', $category->id)
                    ->ignore($participant?->id),
            ],
        ];
    }

    private function authorizeCategory(Event $event, RunningEventCategory $category): void
    {
        abort_unless($event->specific instanceof RunningEvent, 404);
        abort_unless($category->running_event_id === $event->eventable_id, 404);
    }

    private function authorizeParticipant(RunningEventCategory $category, RaceParticipant $participant): void
    {
        abort_unless($participant->running_event_category_id === $category->id, 404);
    }
}
