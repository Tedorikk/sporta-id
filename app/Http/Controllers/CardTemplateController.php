<?php

namespace App\Http\Controllers;

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
            'attendeeTypes' => $event->attendeeTypes()->where('is_active', true)->withCount('attendees')->orderBy('label')->get(),
            // Lets the index draw a real preview for rows that have no custom design yet.
            'defaultTemplates' => collect(CardTemplate::SUBJECT_TYPES)
                ->mapWithKeys(fn (string $subject) => [$subject => CardTemplate::fallbackTemplate($subject)]),
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
            'attendeeTypes' => $event->attendeeTypes()->where('is_active', true)->orderBy('label')->get(),
            'sampleAttendee' => $sampleAttendee,
            // Powers the builder's "reset to default layout" action.
            'defaultTemplate' => CardTemplate::fallbackTemplate($subjectType),
        ]);
    }

    public function store(Request $request, Event $event)
    {
        $validated = $this->validated($request, $event);

        // One template per event/subject/type combination — updateOrCreate keeps a
        // double submit (or a stale builder tab) from producing a shadow duplicate
        // that resolveFor() would silently ignore.
        $template = $event->cardTemplates()->updateOrCreate(
            [
                'subject_type' => $validated['subject_type'],
                'attendee_type_id' => $validated['attendee_type_id'] ?? null,
            ],
            $validated,
        );

        return redirect()
            ->route('id-card-templates.builder', [$event, 'subject_type' => $template->subject_type, 'attendee_type_id' => $template->attendee_type_id])
            ->with(['toast' => ['title' => 'Success', 'description' => 'Template saved.']]);
    }

    public function update(Request $request, Event $event, CardTemplate $cardTemplate)
    {
        abort_unless($cardTemplate->event_id === $event->id, 404);

        $validated = $this->validated($request, $event);

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

    private function validated(Request $request, Event $event): array
    {
        return $request->validate([
            'subject_type' => ['required', Rule::in(CardTemplate::SUBJECT_TYPES)],
            'attendee_type_id' => ['nullable', Rule::exists('attendee_types', 'id')->where('event_id', $event->id)],
            'name' => ['required', 'string', 'max:255'],
            'canvas' => ['required', 'array'],
            'canvas.width' => ['required', 'numeric', 'min:40', 'max:4000'],
            'canvas.height' => ['required', 'numeric', 'min:40', 'max:4000'],
            // Long enough for a multi-stop CSS gradient, not just a hex color.
            'canvas.background' => ['nullable', 'string', 'max:1000'],
            // `present` rather than `required`: an empty canvas is a legitimate
            // save (e.g. clearing a design), and `required` rejects `[]`.
            'elements' => ['present', 'array', 'max:100'],
            'elements.*.id' => ['required', 'string', 'max:64'],
            'elements.*.kind' => ['required', Rule::in(['text', 'image', 'qr', 'shape'])],
            'elements.*.name' => ['nullable', 'string', 'max:100'],
            'elements.*.binding' => ['nullable', 'string', 'max:60'],
            'elements.*.x' => ['required', 'numeric'],
            'elements.*.y' => ['required', 'numeric'],
            'elements.*.width' => ['required', 'numeric', 'min:1'],
            'elements.*.height' => ['required', 'numeric', 'min:1'],
            'elements.*.rotation' => ['nullable', 'numeric'],
            'elements.*.zIndex' => ['nullable', 'numeric'],
            'elements.*.locked' => ['nullable', 'boolean'],
            'elements.*.hidden' => ['nullable', 'boolean'],
            'elements.*.style' => ['nullable', 'array'],
            // Long enough for a multi-stop CSS gradient, not just a hex color.
            'elements.*.style.background' => ['nullable', 'string', 'max:1000'],
            'elements.*.style.color' => ['nullable', 'string', 'max:100'],
            'elements.*.style.borderColor' => ['nullable', 'string', 'max:100'],
            'elements.*.staticText' => ['nullable', 'string', 'max:500'],
            'elements.*.staticImageUrl' => ['nullable', 'string', 'max:2000'],
        ], [
            'elements.max' => 'A card template can hold at most 100 layers.',
            'canvas.width.max' => 'Card width must be between 40 and 4000 pixels.',
            'canvas.height.max' => 'Card height must be between 40 and 4000 pixels.',
        ]);
    }
}
