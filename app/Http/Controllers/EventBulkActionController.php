<?php

namespace App\Http\Controllers;

use App\Models\Event;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;

/**
 * Batch operations for the events list. The single-row publish switch posts here
 * too, with one id, so there is only one authorization path to reason about.
 */
class EventBulkActionController extends Controller
{
    public function updatePublication(Request $request)
    {
        $validated = $request->validate([
            'ids' => ['required', 'array', 'min:1', 'max:100'],
            'ids.*' => ['integer'],
            'is_published' => ['required', 'boolean'],
        ]);

        $events = $this->authorizedEvents($request, $validated['ids'], 'update');

        Event::whereKey($events->modelKeys())->update([
            'is_published' => $validated['is_published'],
        ]);

        $verb = $validated['is_published'] ? 'published' : 'moved to draft';

        return back()->with(['toast' => [
            'title' => 'Success',
            'description' => $this->countLabel($events->count())." {$verb}.",
        ]]);
    }

    public function destroy(Request $request)
    {
        $validated = $request->validate([
            'ids' => ['required', 'array', 'min:1', 'max:100'],
            'ids.*' => ['integer'],
        ]);

        $events = $this->authorizedEvents($request, $validated['ids'], 'delete');

        // Deleted one at a time so model events and cascades behave exactly as
        // they do for a single-event delete.
        $events->each->delete();

        return back()->with(['toast' => [
            'title' => 'Success',
            'description' => $this->countLabel($events->count()).' deleted.',
        ]]);
    }

    /**
     * Resolves the ids inside the caller's own organization and checks the policy
     * for each. An id outside the organization is a 404 rather than a 403, so the
     * endpoint cannot be used to probe for events belonging to someone else.
     *
     * @param  array<int, int>  $ids
     * @return Collection<int, Event>
     */
    private function authorizedEvents(Request $request, array $ids, string $ability): Collection
    {
        $ids = array_values(array_unique($ids));

        $events = Event::query()
            ->forOrganization($request->user()->current_organization_id)
            ->whereKey($ids)
            ->get();

        abort_if($events->count() !== count($ids), 404);

        foreach ($events as $event) {
            Gate::authorize($ability, $event);
        }

        return $events;
    }

    private function countLabel(int $count): string
    {
        return $count.' '.str('event')->plural($count);
    }
}
