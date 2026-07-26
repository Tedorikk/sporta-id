<?php

namespace App\Http\Controllers;

use App\Models\AttendeeType;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

class AttendeeTypeController extends Controller
{
    public function index()
    {
        return Inertia::render('dashboard/attendee-types/index', [
            'attendeeTypes' => AttendeeType::withCount('attendees')->orderBy('label')->get(),
        ]);
    }

    public function store(Request $request)
    {
        $validated = $this->validated($request);

        AttendeeType::create($validated);

        return redirect()->route('attendee-types.index')->with(['toast' => [
            'title' => 'Success',
            'description' => 'Attendee type created successfully.',
        ]]);
    }

    public function update(Request $request, AttendeeType $attendeeType)
    {
        $validated = $this->validated($request, $attendeeType);

        $attendeeType->update($validated);

        return redirect()->route('attendee-types.index')->with(['toast' => [
            'title' => 'Success',
            'description' => 'Attendee type updated successfully.',
        ]]);
    }

    public function destroy(AttendeeType $attendeeType)
    {
        if ($attendeeType->attendees()->exists()) {
            return redirect()->route('attendee-types.index')->with(['toast' => [
                'title' => 'Error',
                'description' => 'This type still has attendees assigned to it and cannot be deleted.',
            ]]);
        }

        $attendeeType->delete();

        return redirect()->route('attendee-types.index')->with(['toast' => [
            'title' => 'Success',
            'description' => 'Attendee type deleted successfully.',
        ]]);
    }

    private function validated(Request $request, ?AttendeeType $attendeeType = null): array
    {
        return $request->validate([
            'key' => [
                'required', 'string', 'max:100', 'regex:/^[a-z0-9_-]+$/',
                Rule::unique('attendee_types', 'key')->ignore($attendeeType?->id),
            ],
            'label' => ['required', 'string', 'max:255'],
            'icon' => ['nullable', 'string', 'max:100'],
            'color' => ['nullable', 'string', 'max:20'],
            'is_active' => ['nullable', 'boolean'],
        ], [
            'key.regex' => 'Key may only contain lowercase letters, numbers, dashes and underscores.',
        ]);
    }
}
