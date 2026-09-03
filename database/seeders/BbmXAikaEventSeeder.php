<?php

namespace Database\Seeders;

use App\Models\BasketballEvent;
use App\Models\Event;
use App\Models\Organization;
use Illuminate\Database\Seeder;

class BbmXAikaEventSeeder extends Seeder
{
    /**
     * Category name => list of team names already assigned to it.
     */
    private const CATEGORIES = [
        'KU 8 FG' => [
            'BBM X AIKA A', 'BBM X AIKA B', 'PELITA CEMERLANG', 'METEOR',
            'KANCIL', 'TENAGA BARU', 'JAMBORE', 'VIVA PINYUH',
        ],
        'KU 10 MIX' => [
            'BBM X AIKA', 'PELITA CEMERLANG', 'METEOR', 'KANCIL',
            'TENAGA BARU', 'BAW', 'SD.K. IMMANUEL 2 KKR', 'JAMBORE', 'VIVA PINYUH',
        ],
        'KU 12 PUTRA' => [
            'BBM X AIKA', 'KANCIL', 'TENAGA BARU', 'PELITA CEMERLANG WARRIOR',
            'METEOR', 'VIVA PINYUH', 'JAMBORE',
        ],
        'KU 12 PUTRI' => [
            'BBM X AIKA', 'KANCIL', 'TENAGA BARU', 'STARS CLUB', 'JAMBORE',
        ],
        'KU 14 PUTRI' => [
            'BBM X AIKA', 'KANCIL', 'METEOR', 'TENAGA BARU', 'JAMBORE', 'VIVA PINYUH',
        ],
        'KU 14 PUTRA' => [
            'BBM X AIKA', 'METEOR', 'WEST BORNEO RISING STAR', 'KANCIL',
            'TENAGA BARU', 'SPARTAN LANDAK', 'JAMBORE', 'VIVA PINYUH', 'VOIS',
        ],
        'KU 16 PUTRA' => [
            'BBM X AIKA A', 'BBM X AIKA B', 'KANCIL', 'TENAGA BARU', 'BAW',
            'JAMBORE', 'VIVA PINYUH', 'VOIS',
        ],
        'KU 16 PUTRI' => [
            'BBM X AIKA', 'KANCIL', 'TENAGA BARU', 'JAMBORE', 'VIVA PINYUH',
        ],
        'SENIOR PUTRA' => [
            'BBM X AIKA A', 'BBM X AIKA B', 'BLACKHOLE', 'ENGGANG BBC X AHIA MANIA',
            'MIDNIGHT', 'METEOR', 'MIRACLE', 'KANCIL', 'TENAGA BARU', 'BAW',
            'PLVA', 'EVENAAR', 'SW', 'JAMBORE A', 'JAMBORE B', 'KHASTRA X VIVA',
            'ELITE BASKETBALL',
        ],
        'SENIOR PUTRI' => [
            'BBM X AIKA', 'METEOR', 'SUGAR RUSH', 'BLEEDGREEN', 'TENAGA BARU',
            'STAR CLUB', 'BAW',
        ],
        'VETERAN KU 40+ PUTRA' => [
            'MORNING SUNS', 'VOIS', 'METEOR', 'METEOR LIU XING', 'BOLTZ', 'MERDEKA BANK KALBAR',
        ],
    ];

    public function run(): void
    {
        $basketballEvent = BasketballEvent::create([
            'pool_drawing_date' => now()->addWeek(),
        ]);

        $event = new Event([
            'organization_id' => Organization::defaultForSeeding()->id,
            'name' => 'BBM X AIKA',
            'description' => 'BBM X AIKA basketball tournament.',
            'contact_person' => '+6281234567890',
            'category' => 'BASKETBALL',
            'is_published' => true,
            'start_date' => now()->addWeeks(3)->format('Y-m-d'),
            'end_date' => now()->addWeeks(5)->format('Y-m-d'),
        ]);
        $event->specific()->associate($basketballEvent);
        $event->save();

        foreach (self::CATEGORIES as $categoryName => $teamNames) {
            $category = $basketballEvent->categories()->create([
                'name' => $categoryName,
                'status' => 'OPEN',
                'min_team' => count($teamNames),
            ]);

            foreach ($teamNames as $teamName) {
                $category->teams()->create([
                    'event_id' => $event->id,
                    'name' => $teamName,
                    'status' => 'verified',
                ]);
            }
        }
    }
}
