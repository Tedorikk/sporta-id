<?php

namespace App\Http\Controllers;

use App\Models\BasketballEvent;
use App\Models\BasketballEventCategory;
use App\Models\Event;
use App\Models\RegistrationCategory;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

/**
 * Tournament configuration for a basketball category. Every category is the
 * sport-specific half of a team registration category — the thing visitors
 * actually buy, with its price, quota and open/close window — so creating one
 * here mints that registration category too, and the pair share a name.
 */
class BasketballEventCategoryController extends Controller
{
    public function store(Request $request, Event $event)
    {
        $basketballEvent = $this->basketballEventFor($event);

        $validated = $request->validate($this->rules());

        DB::transaction(function () use ($event, $basketballEvent, $validated) {
            $registrationCategory = $event->registrationCategories()->create([
                'name' => $validated['name'],
                'subject_type' => RegistrationCategory::SUBJECT_TEAM,
                'form_pages' => BasketballEventCategory::defaultFormPages(),
            ]);

            $basketballEvent->categories()->create([
                ...$validated,
                'registration_category_id' => $registrationCategory->id,
            ]);
        });

        return redirect()->back()->with(['toast' => [
            'title' => 'Success',
            'description' => 'Kategori berhasil ditambahkan.',
        ]]);
    }

    public function update(Request $request, Event $event, BasketballEventCategory $category)
    {
        $this->authorizeCategory($event, $category);

        $validated = $request->validate($this->rules());

        DB::transaction(function () use ($category, $validated) {
            $category->update($validated);
            $category->registrationCategory()->update(['name' => $validated['name']]);
        });

        return redirect()->back()->with(['toast' => [
            'title' => 'Success',
            'description' => 'Kategori berhasil diperbarui.',
        ]]);
    }

    public function destroy(Event $event, BasketballEventCategory $category)
    {
        $this->authorizeCategory($event, $category);

        $registrationCategory = $category->registrationCategory;

        if ($registrationCategory->registrations()->exists()) {
            return redirect()->back()->with(['toast' => [
                'title' => 'Error',
                'description' => 'Kategori ini sudah punya pendaftar dan tidak bisa dihapus.',
            ]]);
        }

        // Cascades to the basketball category, and from there to its teams,
        // pools and matches.
        $registrationCategory->delete();

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
            'min_player_per_team' => ['required', 'integer', 'min:1'],
            'max_player_per_team' => ['nullable', 'integer', 'gte:min_player_per_team'],
            'max_player_per_coach' => ['nullable', 'integer', 'min:1'],
            'roster_closes_at' => ['nullable', 'date'],
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
