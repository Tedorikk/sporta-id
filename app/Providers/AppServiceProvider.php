<?php

namespace App\Providers;

use App\Services\Payments\PaymentCheckoutService;
use App\Services\Payments\PaymentGatewayManager;
use App\Services\Xendit\XenditClient;
use App\Services\Xendit\XenditGateway;
use App\Services\Xendit\XenditStatusMapper;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\Date;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\ServiceProvider;
use Illuminate\Validation\Rules\Password;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        // Register payment gateway manager as singleton
        $this->app->singleton(PaymentGatewayManager::class, function ($app) {
            $manager = new PaymentGatewayManager;

            // Register Xendit gateway
            $xenditClient = new XenditClient;
            $xenditMapper = new XenditStatusMapper;
            $manager->register('xendit', new XenditGateway($xenditClient, $xenditMapper));

            return $manager;
        });

        // Register checkout service
        $this->app->singleton(PaymentCheckoutService::class, function ($app) {
            return new PaymentCheckoutService(
                $app->make(PaymentGatewayManager::class)
            );
        });
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        $this->configureDefaults();
        $this->configureTranslations();
    }

    /**
     * The app's own public-page strings live in lang/app/{locale}.json, apart
     * from the framework strings laravel-lang manages in lang/{locale}.json,
     * so `lang:update` can never overwrite ours. The same files are imported
     * by the client through the `@lang` Vite alias — one source of truth.
     */
    protected function configureTranslations(): void
    {
        $this->app['translator']->addJsonPath(lang_path('app'));
    }

    /**
     * Configure default behaviors for production-ready applications.
     */
    protected function configureDefaults(): void
    {
        Date::use(CarbonImmutable::class);

        DB::prohibitDestructiveCommands(
            app()->isProduction(),
        );

        Password::defaults(fn (): ?Password => app()->isProduction()
            ? Password::min(12)
                ->mixedCase()
                ->letters()
                ->numbers()
                ->symbols()
                ->uncompromised()
            : null,
        );
    }
}
