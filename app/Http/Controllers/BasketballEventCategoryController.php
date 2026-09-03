<?php

namespace App\Http\Controllers;

use App\Models\BasketballEvent;
use App\Models\BasketballEventCategory;
use App\Models\Event;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class BasketballEventCategoryController extends Controller
{
    public function store(Request $request, Event $event)
    {
        $basketballEvent = $this->basketballEventFor($event);

        $validated = $request->validate($this->rules());

        $basketballEvent->categories()->create($validated);

        return redirect()->back()->with(['toast' => [
            'title' => 'Success',
            'description' => 'Kategori berhasil ditambahkan.',
        ]]);
    }

    public function update(Request $request, Event $event, BasketballEventCategory $category)
    {
        $this->authorizeCategory($event, $category);

        $validated = $request->validate($this->rules());

        $category->update($validated);

        return redirect()->back()->with(['toast' => [
            'title' => 'Success',
            'description' => 'Kategori berhasil diperbarui.',
        ]]);
    }

    public function destroy(Event $event, BasketballEventCategory $category)
    {
        $this->authorizeCategory($event, $category);

        $category->delete();

        return redirect()->back()->with(['toast' => [
            'title' => 'Success',
            'description' => 'Kategori berhasil dihapus.',
        ]]);
    }

    private function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],

            'format' => ['required', Rule::in(BasketballEventCategory::FORMATS)],

            'min_team' => ['required', 'integer', 'min:2'],
            'max_team' => ['nullable', 'integer', 'gte:min_team'],
            'min_player_per_team' => ['required', 'integer', 'min:1'],
            'max_player_per_team' => ['nullable', 'integer', 'gte:min_player_per_team'],
            'max_player_per_coach' => ['nullable', 'integer', 'min:1'],
            'price' => ['nullable', 'numeric', 'min:0'],
            'quota' => ['nullable', 'integer', 'min:1'],
            'status' => ['required', 'string', 'max:255'],
        ];
    }

    /**
     * Resolve the BasketballEvent behind a given Event, or fail loudly
     * if this event was never configured as a basketball tournament.
     */
    private function basketballEventFor(Event $event): BasketballEvent
    {
        $basketballEvent = $event->specific;

        abort_unless($basketballEvent instanceof BasketballEvent, 404);

        return $basketballEvent;
    }

    /**
     * Guard against editing/deleting a category that doesn't actually
     * belong to this event's basketball tournament.
     */
    private function authorizeCategory(Event $event, BasketballEventCategory $category): void
    {
        $basketballEvent = $this->basketballEventFor($event);

        abort_unless($category->basketball_event_id === $basketballEvent->id, 404);
    }
}
