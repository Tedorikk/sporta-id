<?php

namespace App\Http\Controllers;

use App\Models\Player;
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

        $team = $player->teams->first();

        if ($team) {
            if ($team->status === 'pending') {
                abort(404, 'Pemain tidak ditemukan');
            } elseif ($team->status === 'rejected') {
                abort(403, 'Tim pemain sudah didiskualifikasi dari turnamen');
            }
        }

        return response()->json($player);
    }
}
