<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CardTemplate extends Model
{
    public const SUBJECT_PLAYER = 'player';

    public const SUBJECT_TEAM = 'team';

    public const SUBJECT_ATTENDEE = 'attendee';

    public const SUBJECT_REGISTRATION = 'registration';

    public const SUBJECT_TYPES = [
        self::SUBJECT_PLAYER,
        self::SUBJECT_TEAM,
        self::SUBJECT_ATTENDEE,
        self::SUBJECT_REGISTRATION,
    ];

    protected $fillable = [
        'event_id', 'subject_type', 'attendee_type_id', 'registration_category_id', 'name', 'canvas', 'elements', 'is_default',
    ];

    protected $casts = [
        'canvas' => 'array',
        'elements' => 'array',
        'is_default' => 'boolean',
    ];

    /** @return BelongsTo<Event, $this> */
    public function event(): BelongsTo
    {
        return $this->belongsTo(Event::class);
    }

    /** @return BelongsTo<AttendeeType, $this> */
    public function attendeeType(): BelongsTo
    {
        return $this->belongsTo(AttendeeType::class);
    }

    /** @return BelongsTo<RegistrationCategory, $this> */
    public function registrationCategory(): BelongsTo
    {
        return $this->belongsTo(RegistrationCategory::class);
    }

    /**
     * Fallback layout used whenever an event has no custom template yet,
     * so a card never renders blank/broken before an organizer builds one.
     */
    public static function fallbackTemplate(string $subjectType): array
    {
        $design = $subjectType === self::SUBJECT_REGISTRATION
            ? self::registrationDefaultDesign()
            : self::classicDefaultDesign();

        return ['subject_type' => $subjectType] + $design;
    }

    /**
     * The registration default is shaped like a B3 badge — 344 x 427 px is
     * 91 x 113 mm at 96 DPI — so the batch print sheet fills each slot edge to
     * edge before an organizer ever opens the designer. Keep it in step with
     * CardPrintLayout::CARD_SIZES['b3'] and the 'b3-portrait' canvas preset.
     *
     * @return array<string, mixed>
     */
    private static function registrationDefaultDesign(): array
    {
        return [
            'canvas' => [
                'width' => 344,
                'height' => 427,
                'background' => '#ffffff',
            ],
            'elements' => [
                ['id' => 'photo', 'kind' => 'image', 'binding' => 'photo', 'x' => 117, 'y' => 24, 'width' => 110, 'height' => 110, 'rotation' => 0, 'zIndex' => 1, 'style' => ['borderRadius' => 16, 'objectFit' => 'cover', 'background' => '#e2e8f0']],
                // Two lines of headroom at this size: most long names wrap
                // rather than shrink, and only the extreme ones scale down.
                ['id' => 'name', 'kind' => 'text', 'binding' => 'name', 'x' => 20, 'y' => 144, 'width' => 304, 'height' => 50, 'rotation' => 0, 'zIndex' => 1, 'style' => ['fontSize' => 20, 'fontWeight' => 700, 'textAlign' => 'center', 'color' => '#0f172a']],
                ['id' => 'type', 'kind' => 'text', 'binding' => 'typeLabel', 'x' => 20, 'y' => 196, 'width' => 304, 'height' => 20, 'rotation' => 0, 'zIndex' => 1, 'style' => ['fontSize' => 13, 'fontWeight' => 600, 'textAlign' => 'center', 'color' => '#dc2626']],
                // A registration has no organization to show, so this line
                // carries the event name instead of always rendering blank.
                ['id' => 'event', 'kind' => 'text', 'binding' => 'eventName', 'x' => 20, 'y' => 218, 'width' => 304, 'height' => 16, 'rotation' => 0, 'zIndex' => 1, 'style' => ['fontSize' => 11, 'textAlign' => 'center', 'color' => '#475569']],
                ['id' => 'qr', 'kind' => 'qr', 'binding' => 'qrDataUrl', 'x' => 99, 'y' => 244, 'width' => 146, 'height' => 146, 'rotation' => 0, 'zIndex' => 1, 'style' => ['borderRadius' => 8]],
                ['id' => 'footer', 'kind' => 'text', 'binding' => null, 'staticText' => 'Sporta Indonesia', 'x' => 20, 'y' => 396, 'width' => 304, 'height' => 16, 'rotation' => 0, 'zIndex' => 1, 'style' => ['fontSize' => 10, 'textAlign' => 'center', 'color' => '#94a3b8']],
            ],
        ];
    }

    /**
     * Attendee, player and team cards keep the original portrait layout —
     * none of them has a print sheet to match yet.
     *
     * @return array<string, mixed>
     */
    private static function classicDefaultDesign(): array
    {
        return [
            'canvas' => [
                'width' => 380,
                'height' => 560,
                'background' => '#ffffff',
            ],
            'elements' => [
                ['id' => 'photo', 'kind' => 'image', 'binding' => 'photo', 'x' => 130, 'y' => 40, 'width' => 120, 'height' => 120, 'rotation' => 0, 'zIndex' => 1, 'style' => ['borderRadius' => 16, 'objectFit' => 'cover', 'background' => '#e2e8f0']],
                ['id' => 'name', 'kind' => 'text', 'binding' => 'name', 'x' => 20, 'y' => 180, 'width' => 340, 'height' => 32, 'rotation' => 0, 'zIndex' => 1, 'style' => ['fontSize' => 22, 'fontWeight' => 700, 'textAlign' => 'center', 'color' => '#0f172a']],
                ['id' => 'type', 'kind' => 'text', 'binding' => 'typeLabel', 'x' => 20, 'y' => 216, 'width' => 340, 'height' => 24, 'rotation' => 0, 'zIndex' => 1, 'style' => ['fontSize' => 13, 'fontWeight' => 600, 'textAlign' => 'center', 'color' => '#dc2626']],
                ['id' => 'organization', 'kind' => 'text', 'binding' => 'organization', 'x' => 20, 'y' => 244, 'width' => 340, 'height' => 20, 'rotation' => 0, 'zIndex' => 1, 'style' => ['fontSize' => 12, 'textAlign' => 'center', 'color' => '#475569']],
                ['id' => 'qr', 'kind' => 'qr', 'binding' => 'qrDataUrl', 'x' => 90, 'y' => 300, 'width' => 200, 'height' => 200, 'rotation' => 0, 'zIndex' => 1, 'style' => ['borderRadius' => 8]],
                ['id' => 'footer', 'kind' => 'text', 'binding' => null, 'staticText' => 'Sporta Indonesia', 'x' => 20, 'y' => 520, 'width' => 340, 'height' => 20, 'rotation' => 0, 'zIndex' => 1, 'style' => ['fontSize' => 10, 'textAlign' => 'center', 'color' => '#94a3b8']],
            ],
        ];
    }

    /**
     * Resolve the template to render for a given event/subject combination.
     * Precedence: type-specific template -> event's generic template for
     * that subject -> hardcoded fallback (always present).
     */
    public static function resolveFor(Event $event, string $subjectType, ?int $attendeeTypeId = null, ?int $registrationCategoryId = null): array
    {
        $query = static::query()
            ->where('event_id', $event->id)
            ->where('subject_type', $subjectType);

        $template = null;

        if ($attendeeTypeId !== null) {
            $template = (clone $query)->where('attendee_type_id', $attendeeTypeId)->first();
        } elseif ($registrationCategoryId !== null) {
            $template = (clone $query)->where('registration_category_id', $registrationCategoryId)->first();
        }

        $template ??= (clone $query)->whereNull('attendee_type_id')->whereNull('registration_category_id')->first();

        if ($template) {
            return [
                'id' => $template->id,
                'subject_type' => $template->subject_type,
                'canvas' => $template->canvas,
                'elements' => $template->elements,
            ];
        }

        return static::fallbackTemplate($subjectType);
    }
}
