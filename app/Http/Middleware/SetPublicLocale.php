<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\App;
use Symfony\Component\HttpFoundation\Response;

/**
 * Picks the language for the public, registrant-facing pages.
 *
 * Registrants are overwhelmingly Indonesian, so the fallback is `id` rather
 * than the app's default `en`; the dashboard is not on these routes and stays
 * English. An explicit `?lang=` wins and is remembered in a cookie so the
 * choice survives the multi-step form and the links we mail out; without
 * either, the browser's Accept-Language decides.
 */
class SetPublicLocale
{
    public const COOKIE = 'lang';

    public const DEFAULT = 'id';

    public const SUPPORTED = ['id', 'en'];

    /** A year — the choice should outlive a single registration season. */
    private const COOKIE_MINUTES = 60 * 24 * 365;

    /**
     * @param  Closure(Request): (Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $requested = $request->query('lang');
        $locale = self::resolve($requested, $request->cookie(self::COOKIE), $request->getPreferredLanguage(self::SUPPORTED));

        App::setLocale($locale);

        $response = $next($request);

        if (self::supported($requested) && $requested !== $request->cookie(self::COOKIE)) {
            $response->headers->setCookie(cookie(self::COOKIE, $requested, self::COOKIE_MINUTES));
        }

        return $response;
    }

    /** Query string, then cookie, then browser preference, then Indonesian. */
    public static function resolve(?string $query, ?string $cookie, ?string $preferred): string
    {
        foreach ([$query, $cookie, $preferred] as $candidate) {
            if (self::supported($candidate)) {
                return $candidate;
            }
        }

        return self::DEFAULT;
    }

    private static function supported(mixed $locale): bool
    {
        return is_string($locale) && in_array($locale, self::SUPPORTED, true);
    }
}
