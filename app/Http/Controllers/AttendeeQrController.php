<?php

namespace App\Http\Controllers;

use App\Models\Attendee;
use App\Models\CardTemplate;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;

class AttendeeQrController extends Controller
{
    /**
     * Public shareable attendee ID card page.
     * Renders photo, name, type, and QR code using the event's custom
     * card template (or the built-in fallback) — no auth required.
     */
    public function idCard(Attendee $attendee)
    {
        $attendee->load(['attendeeType', 'event']);

        $template = CardTemplate::resolveFor($attendee->event, CardTemplate::SUBJECT_ATTENDEE, $attendee->attendee_type_id);

        return Inertia::render('attendee-id-card', [
            'attendee' => $attendee,
            'template' => $template,
        ]);
    }

    /**
     * API endpoint: resolve an attendee ID and return full data for the scanner.
     */
    public function show(Attendee $attendee)
    {
        $attendee->load(['attendeeType', 'event']);

        Gate::authorize('view', $attendee->event);

        if ($attendee->status === Attendee::STATUS_REVOKED) {
            abort(403, 'This attendee pass has been revoked');
        }

        return response()->json($attendee);
    }
}
