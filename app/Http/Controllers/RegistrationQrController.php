<?php

namespace App\Http\Controllers;

use App\Models\CardTemplate;
use App\Models\Registration;
use Inertia\Inertia;

class RegistrationQrController extends Controller
{
    /**
     * Public shareable registration ID card page (individual registrants only).
     * Renders photo, name, category, and QR code using the event's custom
     * card template (or the built-in fallback) — no auth required.
     */
    public function idCard(Registration $registration)
    {
        $registration->load(['registrationCategory', 'event']);

        abort_unless($registration->status === Registration::STATUS_CONFIRMED, 404);

        $template = CardTemplate::resolveFor(
            $registration->event,
            CardTemplate::SUBJECT_REGISTRATION,
            registrationCategoryId: $registration->registration_category_id,
        );

        return Inertia::render('registration-id-card', [
            'registration' => $registration,
            'template' => $template,
        ]);
    }

    /**
     * API endpoint: resolve a registration ID and return full data for the scanner.
     * Read-only — does not record meeting attendance (see MeetingCheckInController).
     */
    public function show(Registration $registration)
    {
        $registration->load(['registrationCategory', 'event']);

        if ($registration->status !== Registration::STATUS_CONFIRMED) {
            abort(403, 'This registration is not confirmed.');
        }

        return response()->json($registration);
    }
}
