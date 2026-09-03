<?php

use App\Http\Controllers\AttendeeController;
use App\Http\Controllers\AttendeeQrController;
use App\Http\Controllers\AttendeeTypeController;
use App\Http\Controllers\BasketballClubController;
use App\Http\Controllers\BasketballEventCategoryController;
use App\Http\Controllers\BasketballEventController;
use App\Http\Controllers\BracketController;
use App\Http\Controllers\CardTemplateController;
use App\Http\Controllers\ContactController;
use App\Http\Controllers\ContactMessageController;
use App\Http\Controllers\DocumentUploadController;
use App\Http\Controllers\EventController;
use App\Http\Controllers\EventMatchController;
use App\Http\Controllers\GameMatchController;
use App\Http\Controllers\ImageUploadController;
use App\Http\Controllers\LandingController;
use App\Http\Controllers\MeetingAttendanceController;
use App\Http\Controllers\MeetingCheckInController;
use App\Http\Controllers\MeetingController;
use App\Http\Controllers\OrganizationController;
use App\Http\Controllers\OrganizationMemberController;
use App\Http\Controllers\OrganizationSwitchController;
use App\Http\Controllers\PaymentNotificationController;
use App\Http\Controllers\PlayerController;
use App\Http\Controllers\PlayerLookupController;
use App\Http\Controllers\PlayerQrController;
use App\Http\Controllers\PlayerRegistrationController;
use App\Http\Controllers\PoolController;
use App\Http\Controllers\PublicEventController;
use App\Http\Controllers\RegistrationCategoryController;
use App\Http\Controllers\RegistrationController;
use App\Http\Controllers\RegistrationQrController;
use App\Http\Controllers\SpeakerController;
use App\Http\Controllers\TeamController;
use App\Http\Controllers\TeamQrController;
use Illuminate\Support\Facades\Route;

Route::get('/', [LandingController::class, 'index'])->name('home');

// --- Public marketing pages -------------------------------------------------
Route::inertia('about', 'about')->name('about');

// --- Public legal pages (required for payment-gateway onboarding) ----------
Route::inertia('terms', 'terms')->name('terms');
Route::inertia('privacy', 'privacy')->name('privacy');
Route::inertia('refund-policy', 'refund-policy')->name('refund-policy');

Route::get('events', [PublicEventController::class, 'index'])->name('events.public.index');
Route::get('events/{event}', [PublicEventController::class, 'show'])->name('events.public.show');

Route::get('contact', [ContactController::class, 'create'])->name('contact');
Route::post('contact', [ContactController::class, 'store'])->name('contact.store');

// --- Public Team ID Card (shareable, no auth required) --------------------
Route::get('teams/{team}/id-card', [TeamQrController::class, 'idCard'])->name('teams.id-card');

// --- Public Attendee ID Card (guest/tenant/photographer/..., shareable, no auth required) --
Route::get('attendees/{attendee}/id-card', [AttendeeQrController::class, 'idCard'])->name('attendees.id-card');

// --- Public Registration ID Card (individual registrants, shareable, no auth required) --
Route::get('registrations/{registration:qr_token}/id-card', [RegistrationQrController::class, 'idCard'])->name('registrations.id-card');

// --- Public Player Self-Registration & ID Card (shareable, no auth required) --
Route::get('events/{event}/register', [PlayerRegistrationController::class, 'create'])->name('players.register');
Route::post('events/{event}/register', [PlayerRegistrationController::class, 'store'])->name('players.register.store');
Route::get('players/{player}/id-card', [PlayerQrController::class, 'idCard'])->name('players.id-card');

// --- Public dynamic registration (team or individual, any event type) -----
Route::get('events/{event}/registration-categories/{registrationCategory}/register', [RegistrationController::class, 'create'])->name('registrations.create');
Route::post('events/{event}/registration-categories/{registrationCategory}/register', [RegistrationController::class, 'store'])
    ->middleware('throttle:10,1')->name('registrations.store');
Route::get('registrations/{registration:qr_token}/status', [RegistrationController::class, 'status'])->name('registrations.status');
Route::post('registrations/{registration:qr_token}/pay', [RegistrationController::class, 'pay'])
    ->middleware('throttle:20,1')->name('registrations.pay');

// --- Midtrans payment notification webhook (server-to-server, no session) --
Route::post('webhooks/midtrans', [PaymentNotificationController::class, 'handle'])->name('webhooks.midtrans');

// --- Public "Find My ID Card" lookup (no auth required) --------------------
Route::get('find-id', [PlayerLookupController::class, 'index'])->name('players.lookup');
Route::get('find-id/events/{event}/categories', [PlayerLookupController::class, 'categories'])->name('players.lookup.categories');
Route::get('find-id/teams/{team}/players', [PlayerLookupController::class, 'players'])->name('players.lookup.players');

// --- Public photo upload (rate-limited, used by self-registration) --------
Route::post('public-upload/image', [ImageUploadController::class, 'store'])
    ->middleware('throttle:20,1')->name('public-upload.image');
Route::delete('public-upload/image', [ImageUploadController::class, 'destroy'])
    ->middleware('throttle:20,1')->name('public-upload.image.destroy');

// --- Public document upload (rate-limited, used by self-registration) -----
Route::post('public-upload/document', [DocumentUploadController::class, 'store'])
    ->middleware('throttle:20,1')->name('public-upload.document');
Route::delete('public-upload/document', [DocumentUploadController::class, 'destroy'])
    ->middleware('throttle:20,1')->name('public-upload.document.destroy');

Route::middleware(['auth', 'verified'])->group(function () {
    // Outside the organization.current middleware: a user with no organization
    // must be able to reach these to create or be added to one.
    Route::get('dashboard/organizations', [OrganizationController::class, 'index'])->name('organizations.index');
    Route::post('dashboard/organizations', [OrganizationController::class, 'store'])->name('organizations.store');
    Route::put('dashboard/organizations/{organization}', [OrganizationController::class, 'update'])->name('organizations.update');
    Route::delete('dashboard/organizations/{organization}', [OrganizationController::class, 'destroy'])->name('organizations.destroy');
    Route::put('dashboard/organizations/{organization}/switch', [OrganizationSwitchController::class, 'update'])->name('organizations.switch');

    Route::prefix('dashboard/organizations/{organization}/members')->name('organizations.members.')->group(function () {
        Route::get('/', [OrganizationMemberController::class, 'index'])->name('index');
        Route::post('/', [OrganizationMemberController::class, 'store'])->name('store');
        Route::patch('{user}', [OrganizationMemberController::class, 'update'])->name('update');
        Route::delete('{user}', [OrganizationMemberController::class, 'destroy'])->name('destroy');
    });
});

Route::middleware(['auth', 'verified', 'organization.current'])->group(function () {
    Route::inertia('dashboard', 'dashboard/page')->name('dashboard');

    // --- Events -------------------------------------------------------
    Route::prefix('dashboard/events')->group(function () {
        Route::get('/', [EventController::class, 'index'])->name('events.index');
        Route::inertia('create', 'dashboard/events/create')->name('events.create');
        Route::get('{event}', [EventController::class, 'show'])->middleware('event.org')->name('events.show');
        Route::get('{event}/edit', [EventController::class, 'edit'])->middleware('event.org')->name('events.edit');

        // Everything scoped to a single event lives here. The event.org
        // middleware authorizes {event} once for every nested controller.
        Route::prefix('{event}')->middleware('event.org')->group(function () {
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

            Route::resource('attendees', AttendeeController::class)
                ->except(['create', 'edit', 'show']);

            Route::resource('attendee-types', AttendeeTypeController::class)
                ->names('attendee-types')
                ->except(['create', 'edit', 'show']);

            Route::get('registration-categories/builder', [RegistrationCategoryController::class, 'builder'])
                ->name('registration_categories.builder');
            Route::get('registration-categories/{registrationCategory}/responses/export', [RegistrationCategoryController::class, 'exportResponses'])
                ->name('registration_categories.responses.export');
            Route::resource('registration-categories', RegistrationCategoryController::class)
                ->names('registration_categories')
                ->except(['create', 'edit']);

            Route::resource('speakers', SpeakerController::class)
                ->except(['create', 'edit', 'show']);

            Route::resource('meetings', MeetingController::class)
                ->except(['create', 'edit', 'show']);

            Route::get('meetings/{meeting}/attendance', [MeetingAttendanceController::class, 'index'])->name('meetings.attendance.index');
            Route::put('meetings/{meeting}/attendance', [MeetingAttendanceController::class, 'update'])->name('meetings.attendance.update');

            Route::prefix('id-card-templates')->name('id-card-templates.')->group(function () {
                Route::get('/', [CardTemplateController::class, 'index'])->name('index');
                Route::get('builder', [CardTemplateController::class, 'builder'])->name('builder');
                Route::get('preview', [CardTemplateController::class, 'preview'])->name('preview');
                Route::post('/', [CardTemplateController::class, 'store'])->name('store');
                Route::put('{cardTemplate}', [CardTemplateController::class, 'update'])->name('update');
                Route::delete('{cardTemplate}', [CardTemplateController::class, 'destroy'])->name('destroy');
            });

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

    Route::resource('events', EventController::class)->only(['store', 'update', 'destroy'])
        ->middleware('event.org');
    Route::post('events/{event}/basketball', [BasketballEventController::class, 'store'])
        ->middleware('event.org')->name('events.basketball.store');
    Route::put('events/{event}/basketball', [BasketballEventController::class, 'update'])
        ->middleware('event.org')->name('events.basketball.update');

    // --- QR Scanner (admin only) ----------------------------------------
    Route::get('dashboard/qr-scanner', [TeamQrController::class, 'scan'])->name('qr-scanner');
    Route::get('dashboard/teams/{team}/qr-data', [TeamQrController::class, 'show'])->name('teams.qr-data');
    Route::get('dashboard/players/{player}/qr-data', [PlayerQrController::class, 'show'])->name('players.qr-data');
    Route::get('dashboard/attendees/{attendee}/qr-data', [AttendeeQrController::class, 'show'])->name('attendees.qr-data');
    Route::get('dashboard/registrations/{identifier}/qr-data', [RegistrationQrController::class, 'show'])->name('registrations.qr-data');
    Route::post('dashboard/meetings/{meeting}/check-ins', [MeetingCheckInController::class, 'store'])->name('meetings.check-ins.store');
    Route::get('dashboard/meetings/search', [MeetingController::class, 'search'])->name('meetings.search');

    // --- Uploads --------------------------------------------------------
    Route::post('upload/image', [ImageUploadController::class, 'store'])->name('upload.image');
    Route::delete('upload/image', [ImageUploadController::class, 'destroy'])->name('upload.image.destroy');
    Route::post('upload/document', [DocumentUploadController::class, 'store'])->name('upload.document');
    Route::delete('upload/document', [DocumentUploadController::class, 'destroy'])->name('upload.document.destroy');
});

require __DIR__.'/settings.php';
