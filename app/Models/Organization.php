<?php

namespace App\Models;

use Database\Factories\OrganizationFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\Pivot;
use Illuminate\Support\Str;

/**
 * Present whenever the model is loaded through User::organizations(), which
 * carries the member's role on the pivot.
 *
 * @property-read Pivot $pivot
 */
class Organization extends Model
{
    /** @use HasFactory<OrganizationFactory> */
    use HasFactory;

    public const ROLE_OWNER = 'owner';

    public const ROLE_ADMIN = 'admin';

    public const ROLE_MEMBER = 'member';

    public const ROLES = [
        self::ROLE_OWNER,
        self::ROLE_ADMIN,
        self::ROLE_MEMBER,
    ];

    /**
     * Roles allowed to create, edit and delete an organization's content.
     */
    public const MANAGER_ROLES = [
        self::ROLE_OWNER,
        self::ROLE_ADMIN,
    ];

    protected $fillable = ['name', 'slug', 'logo'];

    protected static function boot()
    {
        parent::boot();

        static::creating(function (self $organization) {
            if (empty($organization->slug)) {
                $organization->slug = self::uniqueSlug($organization->name);
            }
        });
    }

    /**
     * @return BelongsToMany<User, $this>
     * @return BelongsToMany<User, $this>
     */
    public function users(): BelongsToMany
    {
        return $this->belongsToMany(User::class)
            ->withPivot('role')
            ->withTimestamps();
    }

    /**
     * @return HasMany<Event, $this>
     * @return HasMany<Event, $this>
     */
    public function events(): HasMany
    {
        return $this->hasMany(Event::class);
    }

    /**
     * @return HasMany<OrganizationInvitation, $this>
     */
    public function invitations(): HasMany
    {
        return $this->hasMany(OrganizationInvitation::class);
    }

    /**
     * @return BelongsToMany<User, $this>
     * @return BelongsToMany<User, $this>
     */
    public function owners(): BelongsToMany
    {
        return $this->users()->wherePivot('role', self::ROLE_OWNER);
    }

    public function ownerCount(): int
    {
        return $this->owners()->count();
    }

    /**
     * @param  array<int, string>  $roles
     */
    public function hasRole(User $user, array $roles): bool
    {
        $role = $this->users()->where('users.id', $user->id)->value('role');

        return $role !== null && in_array($role, $roles, true);
    }

    /**
     * The organization seeded demo data belongs to. Shares a slug with the
     * tenancy backfill migration so seeded and pre-existing events land together.
     */
    public static function defaultForSeeding(): self
    {
        return self::firstOrCreate(
            ['slug' => 'legacy'],
            ['name' => config('app.name').' (Legacy)'],
        );
    }

    private static function uniqueSlug(?string $name): string
    {
        $base = Str::slug((string) $name) ?: 'organization';
        $slug = $base;
        $suffix = 2;

        while (self::where('slug', $slug)->exists()) {
            $slug = $base.'-'.$suffix;
            $suffix++;
        }

        return $slug;
    }
}
