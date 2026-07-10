<?php

use App\Http\Controllers\BasketballClubController;
use App\Http\Controllers\BasketballEventCategoryController;
use App\Http\Controllers\BasketballEventController;
use App\Http\Controllers\BracketController;
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
    Route::prefix('dashboard/events')->group(function () {
        Route::get('/', [EventController::class, 'index'])->name('events.index');
        Route::inertia('create', 'dashboard/events/create')->name('events.create');
        Route::get('{event}', [EventController::class, 'show'])->name('events.show');
        Route::get('{event}/edit', [EventController::class, 'edit'])->name('events.edit');

        // Everything scoped to a single event lives here.
        Route::prefix('{event}')->group(function () {
            Route::resource('teams', TeamController::class);

            Route::resource('teams.players', PlayerController::class)
                ->names('players')
                ->except(['index', 'create', 'edit', 'show']);

            Route::resource('basketball-categories', BasketballEventCategoryController::class)
                ->parameters(['basketball-categories' => 'category'])
                ->names('basketball_categories')
                ->except(['index', 'create', 'edit', 'show']);

            Route::prefix('basketball-categories/{category}')->group(function () {
                Route::post('pools/auto-assign', [PoolController::class, 'autoAssign'])->name('pools.auto-assign');
                Route::delete('pools', [PoolController::class, 'destroyAll'])->name('pools.destroy-all');
                Route::post('pools/{pool}/teams', [PoolController::class, 'assignTeam'])->name('pools.teams.assign');
                Route::delete('pools/{pool}/teams/{team}', [PoolController::class, 'removeTeam'])->name('pools.teams.remove');
                Route::post('pools/{pool}/generate', [GameMatchController::class, 'generateForPool'])->name('pools.generate');
                Route::resource('pools', PoolController::class);

                Route::post('matches/generate', [GameMatchController::class, 'generate'])->name('matches.generate');
                Route::patch('matches/{match}/score', [GameMatchController::class, 'updateScore'])->name('matches.score');
                Route::resource('matches', GameMatchController::class)->except(['store']);

                Route::get('bracket', [BracketController::class, 'index'])->name('bracket.index');
                Route::post('bracket/generate', [BracketController::class, 'generate'])->name('bracket.generate');
            });
        });
    });

    Route::post('/dashboard/basketball-clubs', [BasketballClubController::class, 'store'])
        ->name('basketball-clubs.store');

    Route::resource('events', EventController::class)->only(['store', 'update', 'destroy']);
    Route::post('events/{event}/basketball', [BasketballEventController::class, 'store'])
        ->name('events.basketball.store');

    // --- Uploads --------------------------------------------------------
    Route::post('upload/image', [ImageUploadController::class, 'store'])->name('upload.image');
    Route::delete('upload/image', [ImageUploadController::class, 'destroy'])->name('upload.image.destroy');
});

require __DIR__.'/settings.php';
