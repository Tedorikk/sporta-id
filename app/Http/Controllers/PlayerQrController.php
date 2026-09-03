<?php

namespace App\Http\Controllers;

use App\Models\Player;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;

class PlayerQrController extends Controller
{
    /**
     * Public shareable player ID card page.
     * Renders photo, name, team, category, and QR code — no auth required.
     */
    public function idCard(Player $player)
    {
        $player->load(['teams.basketballEventCategory', 'teams.event']);

        return Inertia::render('player-id-card', [
            'player' => $player,
        ]);
    }

    /**
     * API endpoint: resolve a player ID and return full player data for the scanner.
     */
    public function show(Player $player)
    {
        $player->load(['teams.basketballEventCategory', 'teams.event']);

        if ($player->role === Player::ROLE_MEDIC && ! $player->is_certificate_validated) {
            abort(403, 'Medic certificate not validated');
        }

        $team = $player->teams->first();

        // A player is only reachable through a team, which is what ties them to
        // an event and therefore to an organization. Without one there is no
        // tenancy to verify, so refuse rather than leak the record.
        abort_unless($team !== null, 404, 'Pemain tidak ditemukan');

        Gate::authorize('view', $team->event);

        if ($team->status === 'pending') {
            abort(404, 'Pemain tidak ditemukan');
        } elseif ($team->status === 'rejected') {
            abort(403, 'Tim pemain sudah didiskualifikasi dari turnamen');
        }

        $team->setAttribute('next_match_today', $team->nextMatchToday());

        return response()->json($player);
    }
}
