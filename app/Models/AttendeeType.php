<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class AttendeeType extends Model
{
    /** Seeded onto every event when it's created — see Event::boot(). */
    public const DEFAULTS = [
        ['key' => 'guest', 'label' => 'Guest', 'icon' => 'UserRound', 'color' => '#0ea5e9'],
        ['key' => 'tenant', 'label' => 'Tenant', 'icon' => 'Store', 'color' => '#16a34a'],
        ['key' => 'photographer', 'label' => 'Photographer', 'icon' => 'Camera', 'color' => '#9333ea'],
    ];

    protected $fillable = [
        'event_id', 'key', 'label', 'icon', 'color', 'is_active',
    ];

    protected $casts = [
        'is_active' => 'boolean',
    ];

    public function event(): BelongsTo
    {
        return $this->belongsTo(Event::class);
    }

    public function attendees(): HasMany
    {
        return $this->hasMany(Attendee::class);
    }

    public static function seedDefaultsFor(Event $event): void
    {
        foreach (self::DEFAULTS as $type) {
            static::firstOrCreate(
                ['event_id' => $event->id, 'key' => $type['key']],
                [...$type, 'is_active' => true],
            );
        }
    }
}
