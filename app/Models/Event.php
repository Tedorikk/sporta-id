<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Event extends Model
{
    protected $table = 'events';

    protected $primaryKey = 'id';

    protected $fillable = [
        'name',
        'description',
        'contact_person',
        'category',
        'is_published',
        'start_date',
        'end_date',
        'banner',
    ];

    protected $casts = [
        'is_published' => 'boolean',
        'start_date' => 'date:Y-m-d',
        'end_date' => 'date:Y-m-d',
    ];
}
