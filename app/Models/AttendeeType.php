<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class AttendeeType extends Model
{
    protected $fillable = [
        'key', 'label', 'icon', 'color', 'is_active',
    ];

    protected $casts = [
        'is_active' => 'boolean',
    ];

    public function attendees(): HasMany
    {
        return $this->hasMany(Attendee::class);
    }
}
