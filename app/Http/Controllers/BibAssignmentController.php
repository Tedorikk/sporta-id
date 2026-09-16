<?php

namespace App\Http\Controllers;

use App\Models\Event;
use App\Models\RunningEvent;
use App\Models\RunningEventCategory;
use App\Services\Running\BibNumberAssigner;

class BibAssignmentController extends Controller
{
    public function __construct(private BibNumberAssigner $bibs) {}

    public function store(Event $event, RunningEventCategory $category)
    {
        abort_unless($event->specific instanceof RunningEvent, 404);
        abort_unless($category->running_event_id === $event->eventable_id, 404);

        ['created' => $created, 'assigned' => $assigned] = $this->bibs->assign($category);

        return redirect()->back()->with(['toast' => [
            'title' => 'Success',
            'description' => $assigned === 0
                ? 'Every runner already has a bib number.'
                : "Assigned {$assigned} bib number(s), including {$created} new registrant(s).",
        ]]);
    }
}
