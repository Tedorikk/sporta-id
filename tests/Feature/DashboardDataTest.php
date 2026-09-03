<?php

use App\Models\Event;
use App\Models\Payment;
use App\Models\Registration;
use App\Models\RegistrationCategory;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

function dashboardCategory(Event $event, array $overrides = []): RegistrationCategory
{
    return RegistrationCategory::create(array_merge([
        'event_id' => $event->id,
        'name' => '5K Run',
        'subject_type' => RegistrationCategory::SUBJECT_INDIVIDUAL,
        'price' => '150000',
        'form_pages' => [],
    ], $overrides));
}

function dashboardRegistration(RegistrationCategory $category, string $status, array $overrides = []): Registration
{
    return Registration::create(array_merge([
        'registration_category_id' => $category->id,
        'event_id' => $category->event_id,
        'name' => 'Budi Santoso',
        'status' => $status,
        'form_data' => [],
    ], $overrides));
}

test('the dashboard reports counts and settled revenue for the current organization', function () {
    $event = Event::factory()->create([
        'is_published' => true,
        'start_date' => now()->subDay()->format('Y-m-d'),
        'end_date' => now()->addDay()->format('Y-m-d'),
    ]);
    $category = dashboardCategory($event);

    $confirmed = dashboardRegistration($category, Registration::STATUS_CONFIRMED);
    dashboardRegistration($category, Registration::STATUS_PENDING_PAYMENT);

    Payment::create([
        'registration_id' => $confirmed->id,
        'order_id' => 'REG-1-AAA111',
        'amount' => 150000,
        'status' => Payment::STATUS_SETTLEMENT,
        'paid_at' => now(),
    ]);

    $this->actingAs(organizerOf($event))
        ->get(route('dashboard'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('dashboard/page')
            ->where('stats.events_ongoing', 1)
            ->where('stats.registrations_confirmed', 1)
            ->where('stats.registrations_pending', 1)
            ->where('stats.revenue_settled', fn ($value) => (float) $value === 150000.0)
        );
});

test('a pending payment is never counted as revenue', function () {
    $event = Event::factory()->create(['is_published' => true]);
    $category = dashboardCategory($event);
    $registration = dashboardRegistration($category, Registration::STATUS_PENDING_PAYMENT);

    Payment::create([
        'registration_id' => $registration->id,
        'order_id' => 'REG-1-BBB222',
        'amount' => 150000,
        'status' => Payment::STATUS_PENDING,
    ]);

    $this->actingAs(organizerOf($event))
        ->get(route('dashboard'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('stats.revenue_settled', fn ($value) => (float) $value === 0.0)
            ->where('stats.revenue_pending', fn ($value) => (float) $value === 150000.0)
        );
});

test('another organization data never leaks onto the dashboard', function () {
    $mine = Event::factory()->create(['is_published' => true]);
    dashboardRegistration(dashboardCategory($mine), Registration::STATUS_CONFIRMED);

    $theirs = Event::factory()->create(['is_published' => true]);
    $theirCategory = dashboardCategory($theirs);
    foreach (range(1, 3) as $i) {
        dashboardRegistration($theirCategory, Registration::STATUS_CONFIRMED, ['name' => "Other {$i}"]);
    }

    $this->actingAs(organizerOf($mine))
        ->get(route('dashboard'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('stats.registrations_confirmed', 1)
            ->has('recentRegistrations', 1)
            ->has('activeEvents', 1)
        );
});

test('active events carry their quota fill', function () {
    $event = Event::factory()->create([
        'is_published' => true,
        'start_date' => now()->addDays(3)->format('Y-m-d'),
        'end_date' => now()->addDays(4)->format('Y-m-d'),
    ]);

    dashboardCategory($event, ['name' => 'A', 'quota' => 100, 'registered_count' => 30]);
    dashboardCategory($event, ['name' => 'B', 'quota' => 50, 'registered_count' => 10]);

    $this->actingAs(organizerOf($event))
        ->get(route('dashboard'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('activeEvents.0.quota_total', 150)
            ->where('activeEvents.0.registered_total', 40)
        );
});

test('finished events drop off the active list', function () {
    $event = Event::factory()->create([
        'is_published' => true,
        'start_date' => now()->subDays(10)->format('Y-m-d'),
        'end_date' => now()->subDays(5)->format('Y-m-d'),
    ]);

    $this->actingAs(organizerOf($event))
        ->get(route('dashboard'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page->has('activeEvents', 0));
});

test('the attention panel flags expiring payments and nearly full categories', function () {
    $event = Event::factory()->create(['is_published' => true]);

    $category = dashboardCategory($event, ['quota' => 10, 'registered_count' => 9]);
    dashboardRegistration($category, Registration::STATUS_PENDING_PAYMENT, [
        'expires_at' => now()->addHours(3),
    ]);

    $this->actingAs(organizerOf($event))
        ->get(route('dashboard'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('attention.payments_expiring_soon', 1)
            ->where('attention.categories_nearly_full', 1)
        );
});

test('an organization with nothing in it still renders', function () {
    $event = Event::factory()->create();

    $this->actingAs(organizerOf($event))
        ->get(route('dashboard'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('stats.registrations_confirmed', 0)
            ->where('stats.revenue_settled', fn ($value) => (float) $value === 0.0)
            ->has('recentRegistrations', 0)
        );
});
