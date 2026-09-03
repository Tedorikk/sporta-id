<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Keeps users who belong to no organization out of the dashboard, which would
 * otherwise render with a null organization everywhere.
 */
class EnsureHasCurrentOrganization
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if ($user !== null && $user->resolveCurrentOrganization() === null) {
            return redirect()->route('organizations.index');
        }

        return $next($request);
    }
}
