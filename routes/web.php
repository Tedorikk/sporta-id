<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\EventController;
use App\Http\Controllers\ImageUploadController;

Route::inertia('/', 'landing')->name('home');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::inertia('dashboard', 'dashboard/page')->name('dashboard');
    Route::get('dashboard/events', [EventController::class, 'index'])->name('events.index');
    Route::inertia('dashboard/events/create', 'dashboard/events/create')->name('events.create');
    Route::post('/events', [EventController::class, 'store'])->name('events.store');
    Route::post('/upload/image', [ImageUploadController::class, 'store'])->name('upload.image');
    Route::delete('/upload/image', [ImageUploadController::class, 'destroy'])->name('upload.image.destroy');
});

require __DIR__.'/settings.php';
