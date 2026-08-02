<?php

namespace App\Http\Controllers;

use App\Models\Event;
use App\Models\Meeting;
use App\Models\MeetingCheckIn;
use App\Models\Registration;
use App\Models\RegistrationCategory;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

class MeetingAttendanceController extends Controller
{
    public function index(Event $event, Meeting $meeting)
    {
        abort_unless($meeting->event_id === $event->id, 404);

        $registrations = Registration::where('event_id', $event->id)
            ->where('status', Registration::STATUS_CONFIRMED)
            ->whereHas('registrationCategory', fn ($q) => $q->where('subject_type', RegistrationCategory::SUBJECT_INDIVIDUAL))
            ->with(['meetingCheckIns' => fn ($q) => $q->where('meeting_id', $meeting->id)])
            ->orderBy('name')
            ->get()
            ->map(function (Registration $registration) {
                $checkIn = $registration->meetingCheckIns->first();

                return [
                    'id' => $registration->id,
                    'name' => $registration->name,
                    'email' => $registration->email,
                    'status' => $checkIn?->status,
                    'method' => $checkIn?->method,
                ];
            });

        return Inertia::render('dashboard/events/meetings/attendance', [
            'event' => $event,
            'meeting' => $meeting,
            'registrations' => $registrations,
        ]);
    }

    public function update(Request $request, Event $event, Meeting $meeting)
    {
        abort_unless($meeting->event_id === $event->id, 404);

        $validated = $request->validate([
            'registration_id' => [
                'required',
                Rule::exists('registrations', 'id')->where('event_id', $event->id),
            ],
            'status' => ['required', Rule::in(MeetingCheckIn::STATUSES)],
        ]);

        MeetingCheckIn::updateOrCreate(
            ['meeting_id' => $meeting->id, 'registration_id' => $validated['registration_id']],
            ['status' => $validated['status'], 'method' => MeetingCheckIn::METHOD_MANUAL, 'checked_in_by' => $request->user()->id]
        );

        return back()->with(['toast' => [
            'title' => 'Success',
            'description' => 'Attendance updated.',
        ]]);
    }
}
