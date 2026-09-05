<?php

namespace App\Http\Controllers;

use App\Models\ContactMessage;
use App\Models\Event;
use App\Models\Payment;
use App\Models\Registration;
use App\Models\RegistrationCategory;
use App\Models\Vote;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Inertia\Inertia;

class DashboardController extends Controller
{
    /**
     * The organizer's landing screen: what is running, what has been sold, and
     * what needs a decision today — all scoped to the current organization.
     */
    public function index(Request $request)
    {
        $organizationId = $request->user()->current_organization_id;
        $eventIds = Event::query()->forOrganization($organizationId)->pluck('id');

        return Inertia::render('dashboard/page', [
            'stats' => $this->stats($organizationId, $eventIds),
            'activeEvents' => $this->activeEvents($organizationId),
            'recentRegistrations' => $this->recentRegistrations($eventIds),
            'attention' => $this->attention($eventIds),
        ]);
    }

    /**
     * @param  Collection<int, int>  $eventIds
     * @return array<string, mixed>
     */
    private function stats(?int $organizationId, $eventIds): array
    {
        $today = now()->startOfDay();
        $events = Event::query()->forOrganization($organizationId);

        $registrations = fn () => Registration::query()->whereIn('event_id', $eventIds);
        // Revenue spans everything payable at one of these events: paid
        // registrations, and paid votes (which reach an event through their
        // award rather than directly).
        $payments = fn (string $status) => Payment::query()
            ->where('status', $status)
            ->whereHasMorph(
                'payable',
                [Registration::class, Vote::class],
                fn ($query, string $type) => $type === Vote::class
                    ? $query->whereHas('award', fn ($award) => $award->whereIn('event_id', $eventIds))
                    : $query->whereIn('event_id', $eventIds)
            );

        return [
            'events_ongoing' => (clone $events)
                ->where('start_date', '<=', $today)->where('end_date', '>=', $today)->count(),
            'events_upcoming' => (clone $events)->where('start_date', '>', $today)->count(),
            'events_draft' => (clone $events)->where('is_published', false)->count(),
            'registrations_confirmed' => $registrations()->where('status', Registration::STATUS_CONFIRMED)->count(),
            'registrations_pending' => $registrations()->where('status', Registration::STATUS_PENDING_PAYMENT)->count(),
            // Settled money only. Pending is shown separately so the two are
            // never added together and mistaken for revenue.
            'revenue_settled' => (float) $payments(Payment::STATUS_SETTLEMENT)->sum('amount'),
            'revenue_pending' => (float) $payments(Payment::STATUS_PENDING)->sum('amount'),
        ];
    }

    /**
     * Events happening now or next, with how full each one is.
     */
    private function activeEvents(?int $organizationId)
    {
        return Event::query()
            ->forOrganization($organizationId)
            ->where('end_date', '>=', now()->startOfDay())
            ->withSum('registrationCategories as quota_total', 'quota')
            ->withSum('registrationCategories as registered_total', 'registered_count')
            ->withMin('registrationCategories as price_from', 'price')
            ->orderBy('start_date')
            ->limit(5)
            ->get()
            ->map(function (Event $event) {
                $quota = $event->getAttribute('quota_total');

                return [
                    ...$event->toArray(),
                    'quota_total' => $quota === null ? null : (int) $quota,
                    'registered_total' => (int) ($event->getAttribute('registered_total') ?? 0),
                ];
            });
    }

    /**
     * @param  Collection<int, int>  $eventIds
     */
    private function recentRegistrations($eventIds)
    {
        return Registration::query()
            ->whereIn('event_id', $eventIds)
            ->with(['event:id,name', 'registrationCategory:id,name,price'])
            ->latest()
            ->limit(8)
            ->get(['id', 'event_id', 'registration_category_id', 'name', 'status', 'created_at'])
            ->map(fn (Registration $registration) => [
                'id' => $registration->id,
                'name' => $registration->name,
                'status' => $registration->status,
                'created_at' => $registration->created_at,
                'event_name' => $registration->event?->name,
                'category_name' => $registration->registrationCategory?->name,
                'price' => $registration->registrationCategory?->price,
            ]);
    }

    /**
     * Things an organizer would want to act on rather than just look at.
     *
     * @param  Collection<int, int>  $eventIds
     * @return array<string, mixed>
     */
    private function attention($eventIds): array
    {
        $expiringSoon = Registration::query()
            ->whereIn('event_id', $eventIds)
            ->where('status', Registration::STATUS_PENDING_PAYMENT)
            ->whereNotNull('expires_at')
            ->where('expires_at', '<=', now()->addDay())
            ->count();

        // Nearly-full categories are the ones worth raising a quota on before
        // they start turning people away.
        $nearlyFull = RegistrationCategory::query()
            ->whereIn('event_id', $eventIds)
            ->whereNotNull('quota')
            ->where('quota', '>', 0)
            ->whereRaw('registered_count >= quota * 0.9')
            ->count();

        return [
            'payments_expiring_soon' => $expiringSoon,
            'categories_nearly_full' => $nearlyFull,
            'unpublished_starting_soon' => Event::query()
                ->whereIn('id', $eventIds)
                ->where('is_published', false)
                ->whereBetween('start_date', [now()->startOfDay(), now()->addDays(14)])
                ->count(),
            'contact_messages_this_week' => ContactMessage::query()
                ->where('created_at', '>=', now()->subWeek())
                ->count(),
        ];
    }
}
