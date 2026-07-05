<?php

namespace App\Http\Controllers\Admin\Basketball;

use App\Http\Controllers\Controller;
use App\Models\Event;
use App\Models\Team;
use App\Services\Basketball\TeamService;
use Illuminate\Http\Request;

class TeamController extends Controller
{
    public function __construct(
        protected TeamService $teamService
    ) {}

    // Verifikasi tim yang statusnya 'pending'
    public function verify(Request $request, Event $event, Team $team)
    {
        try {
            $this->teamService->verifyTeam($team);

            return back()->with(['toast' => [
                'title' => 'Sukses',
                'description' => "Tim {$team->name} berhasil diverifikasi."
            ]]);
        } catch (\Exception $e) {
            return back()->withErrors(['error' => $e->getMessage()]);
        }
    }

    // Tolak tim (misal dokumen salah)
    public function reject(Request $request, Event $event, Team $team)
    {
        try {
            $this->teamService->rejectTeam($team);

            return back()->with(['toast' => [
                'title' => 'Ditolak',
                'description' => "Tim {$team->name} telah ditolak."
            ]]);
        } catch (\Exception $e) {
            return back()->withErrors(['error' => $e->getMessage()]);
        }
    }
}
