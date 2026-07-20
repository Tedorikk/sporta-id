<?php

namespace App\Http\Controllers;

use App\Models\Event;
use Inertia\Inertia;

class LandingController extends Controller
{
    public function index()
    {
        $events = Event::query()
            ->where('is_published', true)
            ->orderBy('start_date')
            ->get(['id', 'name', 'description', 'category', 'is_published', 'start_date', 'end_date', 'banner']);

        return Inertia::render('landing', [
            'events' => $events,
        ]);
    }
}
