<?php

namespace App\Http\Middleware;

use Illuminate\Http\Request;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that's loaded on the first page visit.
     *
     * @see https://inertiajs.com/server-side-setup#root-template
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Determines the current asset version.
     *
     * @see https://inertiajs.com/asset-versioning
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Define the props that are shared by default.
     *
     * @see https://inertiajs.com/shared-data
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        $user = $request->user();

        return [
            ...parent::share($request),
            'name' => config('app.name'),
            'auth' => [
                'user' => $user,
                'organization' => fn () => $user?->resolveCurrentOrganization(),
                'organizations' => fn () => $user
                    ?->organizations()
                    ->select('organizations.id', 'organizations.name', 'organizations.slug')
                    ->orderBy('organizations.name')
                    ->get()
                    ->map(fn ($organization) => [
                        'id' => $organization->id,
                        'name' => $organization->name,
                        'slug' => $organization->slug,
                        'role' => $organization->pivot->getAttribute('role'),
                    ]),
            ],
            'sidebarOpen' => ! $request->hasCookie('sidebar_state') || $request->cookie('sidebar_state') === 'true',
            'flash' => [
                'toast' => fn () => $request->session()->get('toast'),
                // Per-row failures from a bulk upload: too many to be a toast,
                // and they belong next to the upload control that produced them.
                'import_errors' => fn () => $request->session()->get('import_errors'),
            ],
        ];
    }
}
