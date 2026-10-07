<?php

use App\Http\Middleware\EnsureEventBelongsToOrganization;
use App\Http\Middleware\EnsureHasCurrentOrganization;
use App\Http\Middleware\HandleAppearance;
use App\Http\Middleware\HandleInertiaRequests;
use App\Http\Middleware\NoIndexRestrictedPages;
use App\Http\Middleware\SetPublicLocale;
use Illuminate\Console\Scheduling\Schedule;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Middleware\AddLinkHeadersForPreloadedAssets;
use Illuminate\Http\Request;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->encryptCookies(except: ['appearance', 'sidebar_state', SetPublicLocale::COOKIE]);

        // Xendit posts notifications without a Laravel session/CSRF token.
        $middleware->validateCsrfTokens(except: [
            'webhooks/xendit',
        ]);

        $middleware->web(append: [
            HandleAppearance::class,
            HandleInertiaRequests::class,
            AddLinkHeadersForPreloadedAssets::class,
            NoIndexRestrictedPages::class,
        ]);

        $middleware->alias([
            'event.org' => EnsureEventBelongsToOrganization::class,
            'organization.current' => EnsureHasCurrentOrganization::class,
            'public.locale' => SetPublicLocale::class,
        ]);
    })
    ->withSchedule(function (Schedule $schedule): void {
        // Safety net in case a payment webhook is ever missed
        $schedule->command('registrations:expire-unpaid')->hourly();

        // Reconcile pending payments
        $schedule->command('payments:reconcile-pending')->hourly();

        // Replay failed webhooks
        $schedule->command('payments:replay-webhooks')->everyFifteenMinutes();

        // Dispatch pending effects
        $schedule->command('payments:dispatch-effects')->everyFifteenMinutes();
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->shouldRenderJsonWhen(
            fn (Request $request) => $request->is('api/*') || $request->expectsJson(),
        );
    })->create();
