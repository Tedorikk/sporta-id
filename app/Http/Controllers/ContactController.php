<?php

namespace App\Http\Controllers;

use App\Models\ContactMessage;
use Illuminate\Http\Request;
use Inertia\Inertia;

class ContactController extends Controller
{
    public function create()
    {
        return Inertia::render('contact');
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255'],
            'phone' => ['nullable', 'string', 'max:255'],
            'message' => ['required', 'string', 'min:10'],
        ]);

        ContactMessage::create($validated);

        return redirect()->route('contact')->with(['toast' => [
            'title' => 'Message sent',
            'description' => "Thanks for reaching out — we'll get back to you soon.",
        ]]);
    }
}
