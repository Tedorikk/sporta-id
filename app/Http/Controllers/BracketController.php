<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\BasketballEventCategory;
use App\Models\Event;
use App\Services\Basketball\BracketService;
use Illuminate\Http\Request;
use Inertia\Inertia;

class BracketController extends Controller
{
    public function __construct(protected BracketService $bracket) {}

    public function index(Event $event, BasketballEventCategory $category)
    {
        $bracket = $category->matches()
            ->whereNotNull('round')
            ->where('round', '!=', 'group')
            ->with(['homeTeam', 'awayTeam'])
            ->orderBy('round')
            ->orderBy('match_number')
            ->get()
            ->groupBy('round');

        return Inertia::render('dashboard/events/basketball/bracket/index', [
            'event' => $event,
            'category' => $category,
            'bracket' => $bracket,
        ]);
    }

    public function generate(Request $request, Event $event, BasketballEventCategory $category)
    {
        $validated = $request->validate([
            'advance_per_pool' => 'required|integer|min:1|max:4',
        ]);

        if ($category->pools->isEmpty()) {
            return back()->withErrors(['error' => 'Kategori ini belum memiliki pool.']);
        }

        $incomplete = $category->pools->contains(
            fn ($pool) => $pool->matches()->where('status', '!=', 'completed')->exists()
        );

        if ($incomplete) {
            return back()->withErrors(['error' => 'Semua pertandingan pool harus selesai sebelum membuat bracket.']);
        }

        $this->bracket->generateFromPools($category, $validated['advance_per_pool']);

        return back()->with(['toast' => [
            'title' => 'Sukses',
            'description' => 'Bracket babak knockout berhasil dibuat.',
        ]]);
    }
}
