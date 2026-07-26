<?php

namespace App\Http\Controllers;

use App\Models\AttendeeType;
use App\Models\CardTemplate;
use App\Models\Event;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

class CardTemplateController extends Controller
{
    public function index(Event $event)
    {
        return Inertia::render('dashboard/events/id-card-templates/index', [
            'event' => $event,
            'templates' => $event->cardTemplates()->with('attendeeType')->orderBy('subject_type')->get(),
            'attendeeTypes' => AttendeeType::where('is_active', true)->orderBy('label')->get(),
        ]);
    }

    /**
     * Canvas editor. Loads the existing template for the requested
     * subject/type combination, or seeds the builder with the fallback
     * layout when nothing has been customized yet.
     */
    public function builder(Request $request, Event $event)
    {
        $subjectType = $request->query('subject_type', CardTemplate::SUBJECT_ATTENDEE);
        abort_unless(in_array($subjectType, CardTemplate::SUBJECT_TYPES, true), 404);

        $attendeeTypeId = $request->integer('attendee_type_id') ?: null;

        $existing = $event->cardTemplates()
            ->where('subject_type', $subjectType)
            ->where('attendee_type_id', $attendeeTypeId)
            ->first();

        $template = $existing ?? array_merge(
            CardTemplate::fallbackTemplate($subjectType),
            ['id' => null, 'attendee_type_id' => $attendeeTypeId, 'name' => 'Untitled template']
        );

        $sampleAttendee = $subjectType === CardTemplate::SUBJECT_ATTENDEE
            ? $event->attendees()
                ->with('attendeeType')
                ->when($attendeeTypeId, fn ($q) => $q->where('attendee_type_id', $attendeeTypeId))
                ->first()
            : null;

        return Inertia::render('dashboard/events/id-card-templates/edit', [
            'event' => $event,
            'template' => $template,
            'subjectType' => $subjectType,
            'attendeeTypeId' => $attendeeTypeId,
            'attendeeTypes' => AttendeeType::where('is_active', true)->orderBy('label')->get(),
            'sampleAttendee' => $sampleAttendee,
        ]);
    }

    public function store(Request $request, Event $event)
    {
        $validated = $this->validated($request);

        $template = $event->cardTemplates()->create($validated);

        return redirect()
            ->route('id-card-templates.builder', [$event, 'subject_type' => $template->subject_type, 'attendee_type_id' => $template->attendee_type_id])
            ->with(['toast' => ['title' => 'Success', 'description' => 'Template saved.']]);
    }

    public function update(Request $request, Event $event, CardTemplate $cardTemplate)
    {
        abort_unless($cardTemplate->event_id === $event->id, 404);

        $validated = $this->validated($request);

        $cardTemplate->update($validated);

        return redirect()
            ->route('id-card-templates.builder', [$event, 'subject_type' => $cardTemplate->subject_type, 'attendee_type_id' => $cardTemplate->attendee_type_id])
            ->with(['toast' => ['title' => 'Success', 'description' => 'Template saved.']]);
    }

    public function destroy(Event $event, CardTemplate $cardTemplate)
    {
        abort_unless($cardTemplate->event_id === $event->id, 404);

        $cardTemplate->delete();

        return redirect()->route('id-card-templates.index', $event)->with(['toast' => [
            'title' => 'Success',
            'description' => 'Template deleted — this subject will fall back to the default layout.',
        ]]);
    }

    private function validated(Request $request): array
    {
        return $request->validate([
            'subject_type' => ['required', Rule::in(CardTemplate::SUBJECT_TYPES)],
            'attendee_type_id' => ['nullable', Rule::exists('attendee_types', 'id')],
            'name' => ['required', 'string', 'max:255'],
            'canvas' => ['required', 'array'],
            'canvas.width' => ['required', 'numeric'],
            'canvas.height' => ['required', 'numeric'],
            'canvas.background' => ['nullable', 'string', 'max:50'],
            'elements' => ['required', 'array'],
            'elements.*.id' => ['required', 'string'],
            'elements.*.kind' => ['required', Rule::in(['text', 'image', 'qr', 'shape'])],
            'elements.*.binding' => ['nullable', 'string'],
            'elements.*.x' => ['required', 'numeric'],
            'elements.*.y' => ['required', 'numeric'],
            'elements.*.width' => ['required', 'numeric'],
            'elements.*.height' => ['required', 'numeric'],
            'elements.*.rotation' => ['nullable', 'numeric'],
            'elements.*.zIndex' => ['nullable', 'numeric'],
            'elements.*.style' => ['nullable', 'array'],
            'elements.*.staticText' => ['nullable', 'string'],
            'elements.*.staticImageUrl' => ['nullable', 'string'],
        ]);
    }
}
