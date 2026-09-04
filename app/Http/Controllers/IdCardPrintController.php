<?php

namespace App\Http\Controllers;

use App\Models\CardTemplate;
use App\Models\Event;
use App\Models\Registration;
use App\Models\RegistrationCategory;
use App\Services\CardPrintLayout;
use Illuminate\Http\Request;
use Inertia\Inertia;

class IdCardPrintController extends Controller
{
    /**
     * Print sheet for a registration category: every confirmed registrant's ID
     * card, laid out several to a page so a stack of badges comes off one
     * printer run instead of one browser tab per person.
     *
     * Pass `?ids=3,9` to reprint just those registrations — that's what the
     * per-row print button on the category page uses.
     */
    public function registrationCategory(Request $request, Event $event, RegistrationCategory $registrationCategory)
    {
        abort_unless($registrationCategory->event_id === $event->id, 404);

        // Team categories issue the fixed team card, which isn't template-driven
        // and so has nothing for this page to lay out.
        abort_unless($registrationCategory->subject_type === RegistrationCategory::SUBJECT_INDIVIDUAL, 404);

        $ids = collect(explode(',', (string) $request->query('ids', '')))
            ->map(fn (string $id) => (int) trim($id))
            ->filter()
            ->all();

        $registrations = $registrationCategory->registrations()
            ->where('status', Registration::STATUS_CONFIRMED)
            ->when($ids !== [], fn ($query) => $query->whereIn('id', $ids))
            ->orderBy('name')
            ->get(['id', 'name', 'email', 'phone', 'photo', 'qr_token', 'form_data', 'status']);

        return Inertia::render('id-card-print', [
            'event' => $event,
            'registrationCategory' => $registrationCategory,
            // One template covers the whole sheet — resolution only depends on
            // the event and the category, both of which are fixed here.
            'template' => CardTemplate::resolveFor(
                $event,
                CardTemplate::SUBJECT_REGISTRATION,
                registrationCategoryId: $registrationCategory->id,
            ),
            'registrations' => $registrations,
            'sizes' => CardPrintLayout::options(),
        ]);
    }
}
