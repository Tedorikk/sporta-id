<?php

use App\Http\Controllers\BasketballEventController;
use App\Http\Controllers\EventController;
use App\Http\Controllers\GameMatchController;
use App\Http\Controllers\ImageUploadController;
use App\Http\Controllers\PlayerController;
use App\Http\Controllers\PoolController;
use App\Http\Controllers\TeamController;
use Illuminate\Support\Facades\Route;

Route::inertia('/', 'landing')->name('home');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::inertia('dashboard', 'dashboard/page')->name('dashboard');

    // --- Events -------------------------------------------------------
    // Pages live under dashboard/events/*, mutations live under events/*.
    // Kept this split as-is (frontend forms already post to /events),
    // just grouped it so the split reads as deliberate.
    //
    // NOTE: these 4 routes are named individually (events.index, etc.)
    // rather than via a ->name('events.') group prefix, because a name
    // prefix on the group would also apply to the nested teams/pools/
    // matches/players resources below, turning `teams.index` into
    // `events.teams.index` and breaking every route() call that expects
    // the flat name.
    Route::prefix('dashboard/events')->group(function () {
        Route::get('/', [EventController::class, 'index'])->name('events.index');
        Route::inertia('create', 'dashboard/events/create')->name('events.create');
        Route::get('{event}', [EventController::class, 'show'])->name('events.show');
        Route::get('{event}/edit', [EventController::class, 'edit'])->name('events.edit');

        // Everything scoped to a single event lives here.
        Route::prefix('{event}')->group(function () {
            Route::resource('teams', TeamController::class);
            Route::resource('pools', PoolController::class);
            Route::resource('matches', GameMatchController::class);

            Route::resource('teams.players', PlayerController::class)
                ->names('players')
                ->except(['index', 'create', 'edit', 'show']);
        });
    });

    Route::resource('events', EventController::class)->only(['store', 'update', 'destroy']);
    Route::post('events/{event}/basketball', [BasketballEventController::class, 'store'])
        ->name('events.basketball.store');

    // --- Uploads --------------------------------------------------------
    Route::post('upload/image', [ImageUploadController::class, 'store'])->name('upload.image');
    Route::delete('upload/image', [ImageUploadController::class, 'destroy'])->name('upload.image.destroy');
});

require __DIR__.'/settings.php';