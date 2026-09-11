<?php

namespace App\Http\Controllers;

use App\Models\Event;
use App\Models\RegistrationCategory;
use Inertia\Inertia;

class LandingController extends Controller
{
    public function index()
    {
        $events = Event::query()
            ->where('is_published', true)
            ->with(['registrationCategories' => fn ($query) => $query
                ->with('runningCategory.runningEvent')
                ->orderBy('name')])
            // Price range powers the "from Rp x" line on every event card — a
            // visitor (and Midtrans's reviewer) must be able to see what an
            // event costs before clicking into it.
            ->withMin('registrationCategories as price_from', 'price')
            ->withMax('registrationCategories as price_to', 'price')
            ->orderBy('start_date')
            ->get(['id', 'name', 'description', 'category', 'is_published', 'start_date', 'end_date', 'banner'])
            ->map(function (Event $event) {
                // Each card lists the actual purchasable items with their prices,
                // so the landing page itself is a price list — not just a teaser
                // that needs two more clicks before a price appears anywhere.
                $categories = $event->registrationCategories
                    ->map(fn (RegistrationCategory $category) => $category->toPublicArray())
                    ->values();

                return [
                    ...$event->toArray(),
                    'registration_categories' => $categories,
                ];
            });

        return Inertia::render('landing', [
            'events' => $events,
        ]);
    }
}
