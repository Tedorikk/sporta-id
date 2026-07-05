<?php

namespace App\Services\Basketball;

use App\Models\Event;
use App\Models\Team;
use Exception;
use Illuminate\Support\Facades\DB;

class TeamService
{
    /**
     * Mendaftarkan tim baru beserta roster pemainnya.
     * Menggunakan DB Transaction agar jika ada pemain gagal diinput, seluruh data dibatalkan (rollback).
     */
    public function registerTeam(Event $event, array $teamData, array $playersData): Team
    {
        // 1. Validasi periode pendaftaran
        if (!$event->isRegistrationOpen()) {
            throw new Exception("Periode pendaftaran untuk event ini sedang ditutup.");
        }

        // 2. Validasi jumlah pemain
        $maxPlayers = $event->specific->max_players_per_team ?? 15;
        if (count($playersData) < 5 || count($playersData) > $maxPlayers) {
            throw new Exception("Jumlah pemain harus antara 5 hingga {$maxPlayers} orang.");
        }

        return DB::transaction(function () use ($event, $teamData, $playersData) {
            // Buat Tim
            $team = $event->teams()->create([
                'name'          => $teamData['name'],
                'manager_name'  => $teamData['manager_name'],
                'manager_phone' => $teamData['manager_phone'],
                'logo'          => $teamData['logo'] ?? null,
                'status'        => 'pending', // Default status
            ]);

            // Buat Pemain (QR Code otomatis di-generate oleh Model Player)
            foreach ($playersData as $player) {
                $team->players()->create([
                    'name'          => $player['name'],
                    'jersey_number' => $player['jersey_number'],
                    'position'      => $player['position'] ?? null,
                ]);
            }

            return $team;
        });
    }

    /**
     * Memverifikasi tim oleh admin panitia.
     */
    public function verifyTeam(Team $team): bool
    {
        if ($team->status === 'verified') {
            throw new Exception("Tim ini sudah diverifikasi sebelumnya.");
        }

        return $team->update(['status' => 'verified']);
    }

    /**
     * Menolak tim (misalnya dokumen tidak lengkap).
     */
    public function rejectTeam(Team $team): bool
    {
        return $team->update(['status' => 'rejected']);
    }
}
