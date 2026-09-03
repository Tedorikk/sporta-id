<?php

namespace App\Http\Controllers;

use App\Models\BasketballClub;
use Illuminate\Http\Request;

class BasketballClubController extends Controller
{
    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255', 'unique:basketball_clubs,name'],
        ]);

        BasketballClub::create($validated);

        // Inertia will automatically refresh the page props on redirect,
        // so the new club will immediately appear in the frontend's 'clubs' array!
        return back()->with(['toast' => [
            'title' => 'Success',
            'description' => 'Basketball Club created successfully.',
        ]]);
    }
}
