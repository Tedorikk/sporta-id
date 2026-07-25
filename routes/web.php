<?php

use App\Http\Controllers\BasketballClubController;
use App\Http\Controllers\BasketballEventCategoryController;
use App\Http\Controllers\BasketballEventController;
use App\Http\Controllers\BracketController;
use App\Http\Controllers\ContactController;
use App\Http\Controllers\ContactMessageController;
use App\Http\Controllers\EventController;
use App\Http\Controllers\EventMatchController;
use App\Http\Controllers\GameMatchController;
use App\Http\Controllers\ImageUploadController;
use App\Http\Controllers\LandingController;
use App\Http\Controllers\PlayerController;
use App\Http\Controllers\PlayerLookupController;
use App\Http\Controllers\PlayerQrController;
use App\Http\Controllers\PlayerRegistrationController;
use App\Http\Controllers\PoolController;
use App\Http\Controllers\PublicEventController;
use App\Http\Controllers\TeamController;
use App\Http\Controllers\TeamQrController;
use Illuminate\Support\Facades\Route;

Route::get('/', [LandingController::class, 'index'])->name('home');

// --- Public marketing pages -------------------------------------------------
Route::inertia('about', 'about')->name('about');

Route::get('events', [PublicEventController::class, 'index'])->name('events.public.index');
Route::get('events/{event}', [PublicEventController::class, 'show'])->name('events.public.show');

Route::get('contact', [ContactController::class, 'create'])->name('contact');
Route::post('contact', [ContactController::class, 'store'])->name('contact.store');

// --- Public Team ID Card (shareable, no auth required) --------------------
Route::get('teams/{team}/id-card', [TeamQrController::class, 'idCard'])->name('teams.id-card');

// --- Public Player Self-Registration & ID Card (shareable, no auth required) --
Route::get('events/{event}/register', [PlayerRegistrationController::class, 'create'])->name('players.register');
Route::post('events/{event}/register', [PlayerRegistrationController::class, 'store'])->name('players.register.store');
Route::get('players/{player}/id-card', [PlayerQrController::class, 'idCard'])->name('players.id-card');

// --- Public "Find My ID Card" lookup (no auth required) --------------------
Route::get('find-id', [PlayerLookupController::class, 'index'])->name('players.lookup');
Route::get('find-id/events/{event}/categories', [PlayerLookupController::class, 'categories'])->name('players.lookup.categories');
Route::get('find-id/teams/{team}/players', [PlayerLookupController::class, 'players'])->name('players.lookup.players');

// --- Public photo upload (rate-limited, used by self-registration) --------
Route::post('public-upload/image', [ImageUploadController::class, 'store'])
    ->middleware('throttle:20,1')->name('public-upload.image');
Route::delete('public-upload/image', [ImageUploadController::class, 'destroy'])
    ->middleware('throttle:20,1')->name('public-upload.image.destroy');

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
            Route::get('teams/review-export', [TeamController::class, 'exportReviewAll'])->name('teams.review-export-all');
            Route::get('teams/{team}/review-export', [TeamController::class, 'exportReview'])->name('teams.review-export');
            Route::resource('teams', TeamController::class);

            Route::resource('teams.players', PlayerController::class)
                ->names('players')
                ->except(['index', 'create', 'edit', 'show']);

            Route::resource('basketball-categories', BasketballEventCategoryController::class)
                ->parameters(['basketball-categories' => 'category'])
                ->names('basketball_categories')
                ->except(['index', 'create', 'edit', 'show']);

            Route::get('matches', [EventMatchController::class, 'index'])->name('events.matches.index');

            Route::prefix('basketball-categories/{category}')->group(function () {
                Route::post('pools/auto-assign', [PoolController::class, 'autoAssign'])->name('pools.auto-assign');
                Route::delete('pools', [PoolController::class, 'destroyAll'])->name('pools.destroy-all');
                Route::post('pools/{pool}/teams', [PoolController::class, 'assignTeam'])->name('pools.teams.assign');
                Route::delete('pools/{pool}/teams/{team}', [PoolController::class, 'removeTeam'])->name('pools.teams.remove');
                Route::post('pools/{pool}/generate', [GameMatchController::class, 'generateForPool'])->name('pools.generate');
                Route::resource('pools', PoolController::class);

                Route::post('matches/generate', [GameMatchController::class, 'generate'])->name('matches.generate');
                Route::delete('matches', [GameMatchController::class, 'destroyAll'])->name('matches.destroy-all');
                Route::patch('matches/{match}/score', [GameMatchController::class, 'updateScore'])->name('matches.score');
                Route::resource('matches', GameMatchController::class)->except(['create', 'edit']);

                Route::get('bracket', [BracketController::class, 'index'])->name('bracket.index');
                Route::post('bracket/generate', [BracketController::class, 'generate'])->name('bracket.generate');
            });
        });
    });

    Route::post('/dashboard/basketball-clubs', [BasketballClubController::class, 'store'])
        ->name('basketball-clubs.store');

    Route::get('dashboard/contact-messages', [ContactMessageController::class, 'index'])
        ->name('contact-messages.index');

    Route::resource('events', EventController::class)->only(['store', 'update', 'destroy']);
    Route::post('events/{event}/basketball', [BasketballEventController::class, 'store'])
        ->name('events.basketball.store');

    // --- QR Scanner (admin only) ----------------------------------------
    Route::get('dashboard/qr-scanner', [TeamQrController::class, 'scan'])->name('qr-scanner');
    Route::get('dashboard/teams/{team}/qr-data', [TeamQrController::class, 'show'])->name('teams.qr-data');
    Route::get('dashboard/players/{player}/qr-data', [PlayerQrController::class, 'show'])->name('players.qr-data');

    // --- Uploads --------------------------------------------------------
    Route::post('upload/image', [ImageUploadController::class, 'store'])->name('upload.image');
    Route::delete('upload/image', [ImageUploadController::class, 'destroy'])->name('upload.image.destroy');
});

require __DIR__.'/settings.php';
