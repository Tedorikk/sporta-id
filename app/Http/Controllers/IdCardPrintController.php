<?php

namespace App\Http\Controllers;

use App\Models\Attendee;
use App\Models\AttendeeType;
use App\Models\CardTemplate;
use App\Models\Event;
use App\Models\Registration;
use App\Models\RegistrationCategory;
use App\Services\CardPrintLayout;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Http\Request;
use Inertia\Inertia;

class IdCardPrintController extends Controller
{
    /**
     * Batch ID card printing: every cardholder in one group, laid out several
     * to a page so a stack of badges comes off one printer run instead of one
     * browser tab per person.
     *
     * The two entry points below differ only in which people they gather and
     * what the card's QR points at — everything past that is the same page, so
     * a sheet of guest passes prints exactly like a sheet of registrant badges.
     *
     * Pass `?ids=3,9` to either one to reprint just those cards.
     */
    public function registrationCategory(Request $request, Event $event, RegistrationCategory $registrationCategory)
    {
        abort_unless($registrationCategory->event_id === $event->id, 404);

        // Team categories issue the fixed team card, which isn't template-driven
        // and so has nothing for this page to lay out.
        abort_unless($registrationCategory->subject_type === RegistrationCategory::SUBJECT_INDIVIDUAL, 404);

        $ids = $this->ids($request);

        /** @var Collection<int, Registration> $registrations */
        $registrations = $registrationCategory->registrations()
            ->where('status', Registration::STATUS_CONFIRMED)
            ->when($ids !== [], fn ($query) => $query->whereIn('id', $ids))
            ->orderBy('name')
            ->get();

        return $this->sheet(
            event: $event,
            title: $registrationCategory->name,
            emptyNote: 'ID cards are only issued to confirmed registrations. As soon as a registration is confirmed, its card shows up here.',
            backUrl: "/dashboard/events/{$event->id}/registration-categories/{$registrationCategory->id}",
            designerUrl: "/dashboard/events/{$event->id}/id-card-templates/builder?subject_type=registration&registration_category_id={$registrationCategory->id}",
            template: CardTemplate::resolveFor(
                $event,
                CardTemplate::SUBJECT_REGISTRATION,
                registrationCategoryId: $registrationCategory->id,
            ),
            cards: $registrations->map(fn (Registration $registration) => [
                'id' => $registration->id,
                'url' => "/registrations/{$registration->qr_token}/id-card",
                'data' => [
                    'name' => $registration->name,
                    'typeLabel' => $registrationCategory->name,
                    'photo' => $registration->photo,
                    'email' => $registration->email,
                    'phone' => $registration->phone,
                    'status' => $registration->status,
                    'verificationCode' => $registration->verification_code,
                    ...$this->formDataBindings($registration->form_data),
                ],
            ])->all(),
        );
    }

    public function attendeeType(Request $request, Event $event, AttendeeType $attendeeType)
    {
        abort_unless($attendeeType->event_id === $event->id, 404);

        $ids = $this->ids($request);

        /** @var Collection<int, Attendee> $attendees */
        $attendees = $attendeeType->attendees()
            ->where('status', Attendee::STATUS_ACTIVE)
            ->when($ids !== [], fn ($query) => $query->whereIn('id', $ids))
            ->orderBy('name')
            ->get();

        return $this->sheet(
            event: $event,
            title: $attendeeType->label,
            emptyNote: 'Only active passes get a card. Add someone under Attendees, or un-revoke a pass, and their card shows up here.',
            backUrl: "/dashboard/events/{$event->id}/attendees?type={$attendeeType->id}",
            designerUrl: "/dashboard/events/{$event->id}/id-card-templates/builder?subject_type=attendee&attendee_type_id={$attendeeType->id}",
            template: CardTemplate::resolveFor($event, CardTemplate::SUBJECT_ATTENDEE, $attendeeType->id),
            cards: $attendees->map(fn (Attendee $attendee) => [
                'id' => $attendee->id,
                'url' => "/attendees/{$attendee->id}/id-card",
                'data' => [
                    'name' => $attendee->name,
                    'typeLabel' => $attendeeType->label,
                    'photo' => $attendee->photo,
                    'organization' => $attendee->organization,
                    'title' => $attendee->title,
                    'email' => $attendee->email,
                    'phone' => $attendee->phone,
                    'status' => $attendee->status,
                    'verificationCode' => $attendee->verification_code,
                ],
            ])->all(),
        );
    }

    /**
     * @param  array<string, mixed>  $template
     * @param  list<array<string, mixed>>  $cards
     */
    private function sheet(
        Event $event,
        string $title,
        string $emptyNote,
        string $backUrl,
        string $designerUrl,
        array $template,
        array $cards,
    ) {
        return Inertia::render('id-card-print', [
            'event' => $event,
            'subject' => [
                'title' => $title,
                'emptyNote' => $emptyNote,
                'backUrl' => $backUrl,
                'designerUrl' => $designerUrl,
            ],
            'template' => $template,
            'cards' => $cards,
            'sizes' => CardPrintLayout::options(),
        ]);
    }

    /** @return list<int> */
    private function ids(Request $request): array
    {
        return collect(explode(',', (string) $request->query('ids', '')))
            ->map(fn (string $id) => (int) trim($id))
            ->filter()
            ->values()
            ->all();
    }

    /**
     * Flattens a registration's custom answers under `form_data.<key>`, the
     * same convention the card designer's binding dropdown offers.
     *
     * @param  array<string, mixed>|null  $formData
     * @return array<string, string|null>
     */
    private function formDataBindings(?array $formData): array
    {
        return collect($formData ?? [])
            ->mapWithKeys(fn ($value, $key) => [
                "form_data.{$key}" => match (true) {
                    $value === null => null,
                    is_scalar($value) => (string) $value,
                    // A multi-select or file answer arrives as an array; a card
                    // can still show it, just joined rather than casting-fatal.
                    default => implode(', ', array_filter((array) $value, 'is_scalar')),
                },
            ])
            ->all();
    }
}
