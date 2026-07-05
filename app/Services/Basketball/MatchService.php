<?php

namespace App\Services\Basketball;

use App\Models\Event;
use App\Models\GameMatch;
use Exception;
use Illuminate\Support\Carbon;

class MatchService
{
    /**
     * Menjadwalkan pertandingan baru dengan validasi bentrok jadwal.
     */
    public function scheduleMatch(Event $event, array $data): GameMatch
    {
        if ($data['team_a_id'] === $data['team_b_id']) {
            throw new Exception('Tim A dan Tim B tidak boleh tim yang sama.');
        }

        $scheduledAt = Carbon::parse($data['scheduled_at']);

        // Asumsi 1 pertandingan basket butuh waktu sekitar 2 jam (termasuk pemanasan & jeda)
        $timeWindowStart = $scheduledAt->copy()->subHours(2);
        $timeWindowEnd = $scheduledAt->copy()->addHours(2);

        // 1. Validasi Bentrok Lapangan (Venue)
        $venueConflict = GameMatch::where('event_id', $event->id)
            ->where('venue', $data['venue'])
            ->whereBetween('scheduled_at', [$timeWindowStart, $timeWindowEnd])
            ->exists();

        if ($venueConflict) {
            throw new Exception("Lapangan '{$data['venue']}' sudah terpakai pada rentang waktu tersebut.");
        }

        // 2. Validasi Bentrok Tim (Pastikan tim tidak sedang main di lapangan lain di jam yang sama)
        $teamConflict = GameMatch::where('event_id', $event->id)
            ->whereBetween('scheduled_at', [$timeWindowStart, $timeWindowEnd])
            ->where(function ($query) use ($data) {
                $query->whereIn('team_a_id', [$data['team_a_id'], $data['team_b_id']])
                    ->orWhereIn('team_b_id', [$data['team_a_id'], $data['team_b_id']]);
            })
            ->exists();

        if ($teamConflict) {
            throw new Exception('Salah satu tim sudah memiliki jadwal pertandingan lain pada jam tersebut.');
        }

        // Jika aman, buat jadwal pertandingan
        return $event->matches()->create([
            'pool_id' => $data['pool_id'] ?? null,
            'round' => $data['round'] ?? 'pool',
            'team_a_id' => $data['team_a_id'],
            'team_b_id' => $data['team_b_id'],
            'venue' => $data['venue'],
            'scheduled_at' => $scheduledAt,
            'status' => 'scheduled',
        ]);
    }
}
