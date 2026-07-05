<?php

namespace App\Services\Basketball;

use App\Models\Event;
use App\Models\Pool;
use App\Models\Team;
use Exception;
use Illuminate\Support\Facades\DB;

class PoolService
{
    /**
     * Membuat pool/grup baru untuk suatu event.
     */
    public function createPool(Event $event, string $name): Pool
    {
        return $event->pools()->create([
            'name' => $name
        ]);
    }

    /**
     * Memasukkan tim ke dalam pool.
     */
    public function assignTeamToPool(Team $team, Pool $pool): void
    {
        // 1. Validasi: Pastikan tim dan pool berada di event yang sama
        if ($team->event_id !== $pool->event_id) {
            throw new Exception("Tim dan Pool tidak berasal dari event yang sama.");
        }

        // 2. Validasi: Pastikan status tim sudah 'verified'
        if ($team->status !== 'verified') {
            throw new Exception("Hanya tim yang sudah diverifikasi yang dapat dimasukkan ke dalam Pool.");
        }

        // 3. Validasi Bisnis: Pastikan tim belum ada di pool mana pun pada event ini
        $isAlreadyInAnyPool = DB::table('pool_team')
            ->join('pools', 'pool_team.pool_id', '=', 'pools.id')
            ->where('pools.event_id', $team->event_id)
            ->where('pool_team.team_id', $team->id)
            ->exists();

        if ($isAlreadyInAnyPool) {
            throw new Exception("Tim {$team->name} sudah terdaftar di Pool lain pada event ini.");
        }

        // Jika semua lolos, masukkan ke pivot table
        $pool->teams()->attach($team->id);
    }

    /**
     * Menghapus tim dari pool jika terjadi kesalahan panitia.
     */
    public function removeTeamFromPool(Team $team, Pool $pool): void
    {
        $pool->teams()->detach($team->id);
    }
}
