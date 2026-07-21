<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class NoIndexRestrictedPages
{
    private const RESTRICTED_PATTERNS = [
        'dashboard',
        'dashboard/*',
        'login',
        'forgot-password',
        'reset-password/*',
        'two-factor-challenge',
        'email/verify*',
        'user/*',
        'settings',
        'settings/*',
        'passkeys/*',
    ];

    public function handle(Request $request, Closure $next): Response
    {
        $response = $next($request);

        if ($request->is(...self::RESTRICTED_PATTERNS)) {
            $response->headers->set('X-Robots-Tag', 'noindex, nofollow');
        }

        return $response;
    }
}
