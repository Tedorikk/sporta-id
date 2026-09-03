<?php

namespace App\Http\Controllers;

use App\Models\Meeting;
use App\Models\Team;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;

class TeamQrController extends Controller
{
    /**
     * Admin-only QR scanner page.
     * Renders the camera-based QR reader that resolves team IDs.
     */
    public function scan(Request $request)
    {
        // Bounded to a relevant default window (not "every meeting ever") so this
        // stays fast once an organizer has hundreds/thousands of meetings across
        // events; the combobox falls back to MeetingController::search() for
        // anything outside this window.
        // Event is loaded in full (not a column subset) because its `status`
        // accessor depends on start_date/end_date; a partial select would
        // leave those null and crash the accessor when this gets serialized.
        $organizationId = $request->user()->current_organization_id;

        $meetings = Meeting::with('event')
            ->whereRelation('event', 'organization_id', $organizationId)
            ->where('scheduled_at', '>=', now()->subHours(6))
            ->orderBy('scheduled_at')
            ->limit(50)
            ->get(['id', 'event_id', 'title', 'scheduled_at']);

        $preselectedMeeting = null;

        if ($request->filled('meeting')) {
            $preselectedMeeting = Meeting::with('event')
                ->whereRelation('event', 'organization_id', $organizationId)
                ->find($request->query('meeting'), ['id', 'event_id', 'title', 'scheduled_at']);
        }

        return Inertia::render('dashboard/qr-scanner', [
            'meetings' => $meetings,
            'preselectedMeeting' => $preselectedMeeting,
        ]);
    }

    /**
     * Public shareable team ID card page.
     * Renders logo, team name, and QR code — no auth required.
     */
    public function idCard(Team $team)
    {
        $team->load(['basketballEventCategory', 'event']);

        return Inertia::render('team-id-card', [
            'team' => $team,
        ]);
    }

    /**
     * API endpoint: resolve a team ID and return full team data for the scanner.
     */
    public function show(Team $team)
    {
        $team->load(['players', 'basketballEventCategory', 'event']);

        Gate::authorize('view', $team->event);

        if ($team->status == 'pending') {
            abort(404, 'Tim tidak ditemukan');
        } elseif ($team->status == 'rejected') {
            abort(403, 'Tim sudah didiskualifikasi dari turnamen');
        }

        $team->setAttribute('next_match_today', $team->nextMatchToday());

        return response()->json($team);
    }
}
