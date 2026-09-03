<?php

namespace App\Http\Controllers;

use App\Models\Meeting;
use App\Models\MeetingCheckIn;
use App\Models\Registration;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;

class MeetingCheckInController extends Controller
{
    /**
     * Record a QR-based presence check-in for a registrant at a meeting.
     * Used by the dashboard QR scanner's "Meeting Check-in" mode.
     */
    public function store(Request $request, Meeting $meeting)
    {
        Gate::authorize('update', $meeting->event);

        // The scanner sends whatever the ID card's QR encodes: a qr_token on
        // cards issued now, the numeric id on ones printed before public URLs
        // moved to tokens. Both must check in.
        // alpha_dash covers both shapes the scanner can send — a numeric id and a
        // hyphenated uuid — while still rejecting arrays and junk payloads.
        $validated = $request->validate([
            'registration_id' => ['required', 'alpha_dash'],
        ]);

        $registration = Registration::findByIdOrToken((string) $validated['registration_id']);

        abort_if($registration === null || $registration->event_id !== $meeting->event_id, 404, 'Registration not found.');

        $registration->load(['registrationCategory', 'event']);

        abort_unless($registration->status === Registration::STATUS_CONFIRMED, 403, 'This registration is not confirmed.');

        $existing = MeetingCheckIn::where('meeting_id', $meeting->id)
            ->where('registration_id', $registration->id)
            ->first();

        $alreadyCheckedIn = $existing?->status === MeetingCheckIn::STATUS_PRESENT;

        MeetingCheckIn::updateOrCreate(
            ['meeting_id' => $meeting->id, 'registration_id' => $registration->id],
            ['status' => MeetingCheckIn::STATUS_PRESENT, 'method' => MeetingCheckIn::METHOD_QR, 'scanned_at' => now()]
        );

        return response()->json([
            'registration' => $registration,
            'meeting' => $meeting->only(['id', 'title']),
            'already_checked_in' => $alreadyCheckedIn,
        ]);
    }
}
