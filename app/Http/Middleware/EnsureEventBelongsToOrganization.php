<?php

namespace App\Http\Middleware;

use App\Models\Event;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Symfony\Component\HttpFoundation\Response;

/**
 * Authorizes the {event} route parameter against the current user's
 * organization, covering every controller nested under an event without each
 * one needing its own check.
 */
class EnsureEventBelongsToOrganization
{
    public function handle(Request $request, Closure $next): Response
    {
        $event = $request->route('event');

        // Routes such as events.store carry no {event} parameter.
        if ($event === null) {
            return $next($request);
        }

        if (! $event instanceof Event) {
            $event = Event::findOrFail($event);
        }

        Gate::authorize($request->isMethodSafe() ? 'view' : 'update', $event);

        return $next($request);
    }
}
