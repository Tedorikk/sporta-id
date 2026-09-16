<?php

namespace App\Http\Controllers;

use App\Models\Event;
use App\Models\RunningEvent;
use App\Models\RunningEventCategory;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class RunningEventCategoryController extends Controller
{
    public function store(Request $request, Event $event)
    {
        $runningEvent = $this->runningEventFor($event);

        $validated = $request->validate($this->rules($event));

        $runningEvent->categories()->create($validated);

        return redirect()->back()->with(['toast' => [
            'title' => 'Success',
            'description' => 'Distance added.',
        ]]);
    }

    public function update(Request $request, Event $event, RunningEventCategory $category)
    {
        $this->authorizeCategory($event, $category);

        $validated = $request->validate($this->rules($event));

        $category->update($validated);

        return redirect()->back()->with(['toast' => [
            'title' => 'Success',
            'description' => 'Distance updated.',
        ]]);
    }

    public function destroy(Event $event, RunningEventCategory $category)
    {
        $this->authorizeCategory($event, $category);

        $category->delete();

        return redirect()->back()->with(['toast' => [
            'title' => 'Success',
            'description' => 'Distance deleted.',
        ]]);
    }

    /**
     * @return array<string, array<int, mixed>>
     */
    private function rules(Event $event): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            // Stored in metres so a 21.097 km half marathon stays exact.
            'distance_meters' => ['required', 'integer', 'min:1'],
            'registration_category_id' => [
                'nullable',
                Rule::exists('registration_categories', 'id')->where('event_id', $event->id),
            ],
            'start_at' => ['nullable', 'date'],
            'cutoff_minutes' => ['nullable', 'integer', 'min:1'],
            'bib_prefix' => ['nullable', 'string', 'max:10'],
            'bib_start_number' => ['required', 'integer', 'min:1'],
            'price' => ['nullable', 'numeric', 'min:0'],
            'quota' => ['nullable', 'integer', 'min:1'],
            'status' => ['required', 'string', 'max:255'],
        ];
    }

    /**
     * Resolve the RunningEvent behind a given Event, or fail loudly if this
     * event was never set up as a race.
     */
    private function runningEventFor(Event $event): RunningEvent
    {
        $runningEvent = $event->specific;

        abort_unless($runningEvent instanceof RunningEvent, 404);

        return $runningEvent;
    }

    /**
     * Guard against editing/deleting a distance that doesn't actually belong
     * to this event's race.
     */
    private function authorizeCategory(Event $event, RunningEventCategory $category): void
    {
        $runningEvent = $this->runningEventFor($event);

        abort_unless($category->running_event_id === $runningEvent->id, 404);
    }
}
