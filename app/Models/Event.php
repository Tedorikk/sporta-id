<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Relations\MorphTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

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

    protected $appends = ['status'];

    public function getStatusAttribute(): string
    {
        $today = now()->startOfDay();

        if ($this->start_date->gt($today)) {
            return 'upcoming';
        }

        if ($this->end_date->lt($today)) {
            return 'past';
        }

        return 'ongoing';
    }

    public function scopeSearch(Builder $query, ?string $term): Builder
    {
        return $query->when($term, fn ($q) => $q->where(fn ($q2) => $q2
            ->where('name', 'like', "%{$term}%")
            ->orWhere('description', 'like', "%{$term}%")
        ));
    }

    public function scopeCategory(Builder $query, ?string $category): Builder
    {
        return $query->when($category, fn ($q) => $q->where('category', $category));
    }

    public function scopeStatus(Builder $query, ?string $status): Builder
    {
        return $query->when($status, function ($q) use ($status) {
            $today = now()->startOfDay();

            match ($status) {
                'published' => $q->where('is_published', true),
                'draft' => $q->where('is_published', false),
                'upcoming' => $q->where('start_date', '>', $today),
                'ongoing' => $q->where('start_date', '<=', $today)->where('end_date', '>=', $today),
                'past' => $q->where('end_date', '<', $today),
                default => null,
            };
        });
    }

    // Relasi Polymorphic
    public function specific(): MorphTo
    {
        return $this->morphTo(__FUNCTION__, 'eventable_type', 'eventable_id');
    }

    // Relasi ke Modul Turnamen
    public function teams(): HasMany
    {
        return $this->hasMany(Team::class);
    }

    public function pools(): HasMany
    {
        return $this->hasMany(Pool::class);
    }

    public function matches(): HasMany
    {
        return $this->hasMany(GameMatch::class);
    }
}
