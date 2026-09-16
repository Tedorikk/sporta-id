<?php

use App\Http\Middleware\SetPublicLocale;
use App\Mail\RegistrationConfirmed;
use App\Models\Event;
use App\Models\Registration;
use App\Models\RegistrationCategory;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;

uses(RefreshDatabase::class);

/** Local to this file — Pest helpers defined in another test file aren't shared. */
function localeCategory(array $overrides = []): RegistrationCategory
{
    $event = Event::factory()->create(['is_published' => true]);

    return RegistrationCategory::create(array_merge([
        'event_id' => $event->id,
        'name' => '5K Run',
        'subject_type' => RegistrationCategory::SUBJECT_INDIVIDUAL,
        'price' => null,
        'registration_open' => true,
        'form_pages' => [
            ['key' => 'page-1', 'title' => 'Details', 'fields' => [
                ['key' => 'email', 'label' => 'Email', 'type' => 'email', 'required' => true],
                ['key' => 'shirt_size', 'label' => 'Shirt Size', 'type' => 'select', 'required' => true, 'options' => ['S', 'M']],
            ]],
        ],
    ], $overrides));
}

// ─── Resolution order: query → cookie → Accept-Language → id ───────────────

// Symfony's test request sends `Accept-Language: en-us` by default, like a
// real browser always sends one — so "no preference" is expressed as a
// language we don't have.

test('public pages fall back to Indonesian when the browser asks for a language we don’t have', function () {
    $category = localeCategory();

    $this->withHeaders(['Accept-Language' => 'zh-CN,zh;q=0.9'])
        ->get(route('registrations.create', [$category->event, $category]))
        ->assertOk()
        ->assertInertia(fn ($page) => $page->where('locale', 'id'));
});

test('the browser language is honoured when it is one we support', function () {
    $category = localeCategory();

    $this->withHeaders(['Accept-Language' => 'en-GB,en;q=0.9'])
        ->get(route('registrations.create', [$category->event, $category]))
        ->assertInertia(fn ($page) => $page->where('locale', 'en'));

    $this->withHeaders(['Accept-Language' => 'id-ID,id;q=0.9,en;q=0.5'])
        ->get(route('registrations.create', [$category->event, $category]))
        ->assertInertia(fn ($page) => $page->where('locale', 'id'));
});

test('?lang= wins and is remembered in a cookie', function () {
    $category = localeCategory();
    $url = route('registrations.create', [$category->event, $category]);

    $this->withHeaders(['Accept-Language' => 'id'])
        ->get($url.'?lang=en')
        ->assertInertia(fn ($page) => $page->where('locale', 'en'))
        ->assertCookie(SetPublicLocale::COOKIE, 'en', encrypted: false);

    // A later visit without the query string follows the cookie, and beats the browser.
    $this->withUnencryptedCookie(SetPublicLocale::COOKIE, 'en')
        ->withHeaders(['Accept-Language' => 'id'])
        ->get($url)
        ->assertInertia(fn ($page) => $page->where('locale', 'en'))
        ->assertCookieMissing(SetPublicLocale::COOKIE);
});

test('an unsupported ?lang= is ignored rather than stored', function () {
    $category = localeCategory();

    $this->withHeaders(['Accept-Language' => 'zh-CN'])
        ->get(route('registrations.create', [$category->event, $category]).'?lang=fr')
        ->assertInertia(fn ($page) => $page->where('locale', 'id'))
        ->assertCookieMissing(SetPublicLocale::COOKIE);
});

test('the dashboard is not localised', function () {
    $this->withUnencryptedCookie(SetPublicLocale::COOKIE, 'id')
        ->get(route('login'))
        ->assertInertia(fn ($page) => $page->where('locale', 'en'));
});

// ─── The registrant's language sticks to the registration ──────────────────

test('validation errors on the form come back in the registrant’s language', function () {
    $category = localeCategory();

    $this->from(route('registrations.create', [$category->event, $category]))
        ->post(route('registrations.store', [$category->event, $category]).'?lang=id', [
            'name' => 'Budi Santoso',
        ])
        ->assertSessionHasErrors([
            'email' => 'Email wajib diisi.',
            'form_data.shirt_size' => 'Shirt Size wajib diisi.',
        ]);
});

test('a registration remembers the language it was made in and is confirmed in it', function () {
    Mail::fake();
    $category = localeCategory();

    $this->post(route('registrations.store', [$category->event, $category]).'?lang=en', [
        'name' => 'Budi Santoso',
        'email' => 'budi@example.com',
        'form_data' => ['shirt_size' => 'M'],
    ])->assertOk();

    $registration = Registration::where('email', 'budi@example.com')->firstOrFail();

    expect($registration->locale)->toBe('en');
    Mail::assertQueued(RegistrationConfirmed::class, fn ($mail) => $mail->locale === 'en');
});

test('the confirmation mail renders in Indonesian for an Indonesian registration', function () {
    $category = localeCategory();
    $registration = Registration::create([
        'registration_category_id' => $category->id,
        'event_id' => $category->event_id,
        'name' => 'Budi Santoso',
        'email' => 'budi@example.com',
        'status' => Registration::STATUS_CONFIRMED,
        'locale' => 'id',
    ]);

    $mail = (new RegistrationConfirmed($registration))->locale('id');

    // render() applies the mailable's locale the way send() does.
    $mail->assertSeeInHtml('Anda sudah terdaftar');
    $mail->assertSeeInHtml('Buka ID card Anda');

    app()->setLocale('id');
    expect($mail->envelope()->subject)->toBe('Anda sudah terdaftar — '.$category->event->name);
});
