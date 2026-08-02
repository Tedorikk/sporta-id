<?php

namespace App\Http\Controllers;

use App\Models\Meeting;
use App\Models\Team;
use Inertia\Inertia;

class TeamQrController extends Controller
{
    /**
     * Admin-only QR scanner page.
     * Renders the camera-based QR reader that resolves team IDs.
     */
    public function scan()
    {
        return Inertia::render('dashboard/qr-scanner', [
            // Event is loaded in full (not a column subset) because its `status`
            // accessor depends on start_date/end_date; a partial select would
            // leave those null and crash the accessor when this gets serialized.
            'meetings' => Meeting::with('event')->orderByDesc('scheduled_at')->get(['id', 'event_id', 'title', 'scheduled_at']),
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

        if ($team->status == 'pending') {
            abort(404, 'Tim tidak ditemukan');
        } elseif ($team->status == 'rejected') {
            abort(403, 'Tim sudah didiskualifikasi dari turnamen');
        }

        $team->next_match_today = $team->nextMatchToday();

        return response()->json($team);
    }
}
