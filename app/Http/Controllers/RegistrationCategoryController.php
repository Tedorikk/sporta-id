<?php

namespace App\Http\Controllers;

use App\Models\Event;
use App\Models\Payment;
use App\Models\RegistrationCategory;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

class RegistrationCategoryController extends Controller
{
    public function index(Event $event)
    {
        return Inertia::render('dashboard/events/registration-categories/index', [
            'event' => $event,
            'registrationCategories' => $event->registrationCategories()
                ->withCount('registrations')
                ->latest()
                ->get(),
        ]);
    }

    /**
     * Full-page form builder. With no `registration_category_id` this seeds
     * a blank category for creation; otherwise it loads the existing one
     * for editing — same single-action pattern as CardTemplateController::builder().
     */
    public function builder(Request $request, Event $event)
    {
        $registrationCategoryId = $request->integer('registration_category_id') ?: null;

        $registrationCategory = $registrationCategoryId
            ? $event->registrationCategories()->findOrFail($registrationCategoryId)
            : null;

        return Inertia::render('dashboard/events/registration-categories/builder', [
            'event' => $event,
            'registrationCategory' => $registrationCategory,
        ]);
    }

    /**
     * Streams every response for this category as CSV — column order mirrors
     * the fixed registration columns followed by the form's own field order.
     */
    public function exportResponses(Event $event, RegistrationCategory $registrationCategory)
    {
        abort_unless($registrationCategory->event_id === $event->id, 404);

        $fields = $registrationCategory->inputFields();
        $filename = Str::slug($registrationCategory->name).'-registrations.csv';

        return response()->streamDownload(function () use ($registrationCategory, $fields) {
            $handle = fopen('php://output', 'w');

            fputcsv($handle, array_merge(
                ['Name', 'Email', 'Phone', 'Status', 'Registered At'],
                collect($fields)->pluck('label')->all(),
            ));

            $registrationCategory->registrations()->orderBy('created_at')
                ->chunk(200, function ($registrations) use ($handle, $fields) {
                    foreach ($registrations as $registration) {
                        fputcsv($handle, array_merge([
                            $registration->name,
                            $registration->email,
                            $registration->phone,
                            $registration->status,
                            $registration->created_at?->toDateTimeString(),
                        ], collect($fields)->map(
                            fn (array $field) => data_get($registration->form_data, $field['key'])
                        )->all()));
                    }
                });

            fclose($handle);
        }, $filename, ['Content-Type' => 'text/csv']);
    }

    public function show(Request $request, Event $event, RegistrationCategory $registrationCategory)
    {
        abort_unless($registrationCategory->event_id === $event->id, 404);

        $filters = $request->only(['search', 'status']);

        $registrations = $registrationCategory->registrations()
            ->with([
                'team',
                // The settled payment if there is one, else the most recent
                // attempt — enough for an organizer to reconcile a disputed
                // payment without opening the Midtrans dashboard.
                'payments' => fn ($query) => $query->latest('id'),
            ])
            ->when($filters['search'] ?? null, fn ($q, $search) => $q->where('name', 'like', "%{$search}%"))
            ->when($filters['status'] ?? null, fn ($q, $status) => $q->where('status', $status))
            ->latest()
            ->paginate(15)
            ->withQueryString();

        $registrations->getCollection()->transform(function ($registration) {
            $payment = $registration->payments->firstWhere('status', Payment::STATUS_SETTLEMENT)
                ?? $registration->payments->first();

            $registration->unsetRelation('payments');
            $registration->setAttribute('payment', $payment);

            return $registration;
        });

        return Inertia::render('dashboard/events/registration-categories/show', [
            'event' => $event,
            'registrationCategory' => $registrationCategory,
            'registrations' => $registrations,
            'filters' => $filters,
        ]);
    }

    public function store(Request $request, Event $event)
    {
        $validated = $this->validated($request);

        $event->registrationCategories()->create($validated);

        return redirect()->route('registration_categories.index', $event)->with(['toast' => [
            'title' => 'Success',
            'description' => 'Registration category created successfully.',
        ]]);
    }

    public function update(Request $request, Event $event, RegistrationCategory $registrationCategory)
    {
        abort_unless($registrationCategory->event_id === $event->id, 404);

        $validated = $this->validated($request);

        $registrationCategory->update($validated);

        return redirect()->route('registration_categories.index', $event)->with(['toast' => [
            'title' => 'Success',
            'description' => 'Registration category updated successfully.',
        ]]);
    }

    public function destroy(Event $event, RegistrationCategory $registrationCategory)
    {
        abort_unless($registrationCategory->event_id === $event->id, 404);

        if ($registrationCategory->registrations()->exists()) {
            return redirect()->route('registration_categories.index', $event)->with(['toast' => [
                'title' => 'Error',
                'description' => 'This category already has registrations and cannot be deleted.',
            ]]);
        }

        $registrationCategory->delete();

        return redirect()->route('registration_categories.index', $event)->with(['toast' => [
            'title' => 'Success',
            'description' => 'Registration category deleted successfully.',
        ]]);
    }

    private function validated(Request $request): array
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'subject_type' => ['required', Rule::in(RegistrationCategory::SUBJECT_TYPES)],
            'price' => ['nullable', 'numeric', 'min:0'],
            'quota' => ['nullable', 'integer', 'min:1'],
            'registration_open' => ['nullable', 'boolean'],
            'opens_at' => ['nullable', 'date'],
            'closes_at' => ['nullable', 'date', 'after_or_equal:opens_at'],

            'form_pages' => ['nullable', 'array'],
            'form_pages.*.key' => ['required', 'string', 'max:100'],
            'form_pages.*.title' => ['required', 'string', 'max:255'],
            'form_pages.*.description' => ['nullable', 'string', 'max:1000'],
            'form_pages.*.fields' => ['nullable', 'array'],
            'form_pages.*.fields.*.key' => [
                'required', 'string', 'max:100', 'regex:/^[a-z0-9_]+$/',
                Rule::notIn(['name']),
            ],
            'form_pages.*.fields.*.label' => ['required', 'string', 'max:255'],
            'form_pages.*.fields.*.type' => ['required', Rule::in([
                'text', 'number', 'email', 'phone', 'date', 'select', 'radio', 'checkbox',
                'textarea', 'rating', 'signature', 'file', 'document', 'description',
            ])],
            'form_pages.*.fields.*.required' => ['nullable', 'boolean'],
            'form_pages.*.fields.*.options' => ['nullable', 'array'],
            'form_pages.*.fields.*.options.*' => ['string', 'max:255'],
            'form_pages.*.fields.*.help_text' => ['nullable', 'string', 'max:2000'],
            'form_pages.*.fields.*.min' => ['nullable', 'numeric'],
            'form_pages.*.fields.*.max' => ['nullable', 'numeric'],
            'form_pages.*.fields.*.error_message' => ['nullable', 'string', 'max:255'],
            'form_pages.*.fields.*.max_rating' => ['nullable', 'integer', 'min:1', 'max:10'],

            'form_branding' => ['nullable', 'array'],
            'form_branding.primary_color' => ['nullable', 'string', 'max:20'],
            'form_branding.secondary_color' => ['nullable', 'string', 'max:20'],
            'form_branding.background_color' => ['nullable', 'string', 'max:20'],
            'form_branding.text_color' => ['nullable', 'string', 'max:20'],
            'form_branding.logo_url' => ['nullable', 'string', 'max:2048'],
            'form_branding.font_family' => ['nullable', 'string', 'max:100'],
            'form_branding.border_radius' => ['nullable', Rule::in(['sharp', 'rounded', 'pill'])],
            'form_branding.button_label' => ['nullable', 'string', 'max:50'],

            'form_settings' => ['nullable', 'array'],
            'form_settings.prevent_duplicate_by' => ['nullable', 'string', 'max:100'],
            'form_settings.confirmation_message' => ['nullable', 'string', 'max:1000'],
            'form_settings.notify_emails' => ['nullable', 'array'],
            'form_settings.notify_emails.*' => ['email', 'max:255'],
        ], [
            'form_pages.*.fields.*.key.regex' => 'Field key may only contain lowercase letters, numbers and underscores.',
            // "name" is always collected by the built-in Team/Full Name field and rendered
            // outside the dynamic field list — a custom field reusing that key would silently
            // never appear on the public form, so it's blocked here instead.
            'form_pages.*.fields.*.key.not_in' => '"name" is reserved for the built-in Name field — choose a different key, e.g. "participant_name".',
        ]);

        $keys = collect($validated['form_pages'] ?? [])->flatMap(fn (array $page) => $page['fields'] ?? [])->pluck('key');

        if ($keys->count() !== $keys->unique()->count()) {
            abort(422, 'Field keys must be unique within a form.');
        }

        return $validated;
    }
}
