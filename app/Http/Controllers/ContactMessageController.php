<?php

namespace App\Http\Controllers;

use App\Models\ContactMessage;
use Inertia\Inertia;

class ContactMessageController extends Controller
{
    public function index()
    {
        $messages = ContactMessage::query()
            ->orderBy('created_at', 'desc')
            ->paginate(20);

        return Inertia::render('dashboard/contact-messages/index', [
            'messages' => $messages,
        ]);
    }
}
