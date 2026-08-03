<?php

namespace App\Http\Controllers;

use App\Models\Event;
use App\Models\RegistrationCategory;
use Illuminate\Http\Request;
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
            'form_schema' => ['nullable', 'array'],
            'form_schema.*.key' => [
                'required', 'string', 'max:100', 'regex:/^[a-z0-9_]+$/',
                Rule::notIn(['name']),
            ],
            'form_schema.*.label' => ['required', 'string', 'max:255'],
            'form_schema.*.type' => ['required', Rule::in([
                'text', 'number', 'email', 'phone', 'date', 'select', 'radio', 'checkbox', 'textarea', 'file',
            ])],
            'form_schema.*.required' => ['nullable', 'boolean'],
            'form_schema.*.options' => ['nullable', 'array'],
            'form_schema.*.options.*' => ['string', 'max:255'],
            'form_schema.*.help_text' => ['nullable', 'string', 'max:500'],
        ], [
            'form_schema.*.key.regex' => 'Field key may only contain lowercase letters, numbers and underscores.',
            // "name" is always collected by the built-in Team/Full Name field and rendered
            // outside the dynamic field list — a custom field reusing that key would silently
            // never appear on the public form, so it's blocked here instead.
            'form_schema.*.key.not_in' => '"name" is reserved for the built-in Name field — choose a different key, e.g. "participant_name".',
        ]);

        $keys = collect($validated['form_schema'] ?? [])->pluck('key');

        if ($keys->count() !== $keys->unique()->count()) {
            abort(422, 'Field keys must be unique within a form.');
        }

        return $validated;
    }
}
