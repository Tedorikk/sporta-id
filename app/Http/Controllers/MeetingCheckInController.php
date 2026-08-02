<?php

namespace App\Http\Controllers;

use App\Models\Meeting;
use App\Models\MeetingCheckIn;
use App\Models\Registration;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class MeetingCheckInController extends Controller
{
    /**
     * Record a QR-based presence check-in for a registrant at a meeting.
     * Used by the dashboard QR scanner's "Meeting Check-in" mode.
     */
    public function store(Request $request, Meeting $meeting)
    {
        $validated = $request->validate([
            'registration_id' => [
                'required',
                Rule::exists('registrations', 'id')->where('event_id', $meeting->event_id),
            ],
        ]);

        $registration = Registration::with(['registrationCategory', 'event'])->findOrFail($validated['registration_id']);

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
