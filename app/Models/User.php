<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Carbon;
use Laravel\Fortify\Contracts\PasskeyUser;
use Laravel\Fortify\PasskeyAuthenticatable;
use Laravel\Fortify\TwoFactorAuthenticatable;

/**
 * @property int $id
 * @property string $name
 * @property string $email
 * @property Carbon|null $email_verified_at
 * @property string $password
 * @property string|null $two_factor_secret
 * @property string|null $two_factor_recovery_codes
 * @property Carbon|null $two_factor_confirmed_at
 * @property string|null $remember_token
 * @property int|null $current_organization_id
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
#[Fillable(['name', 'email', 'password'])]
#[Hidden(['password', 'two_factor_secret', 'two_factor_recovery_codes', 'remember_token'])]
class User extends Authenticatable implements PasskeyUser
{
    /** @use HasFactory<UserFactory> */
    use HasFactory, Notifiable, PasskeyAuthenticatable, TwoFactorAuthenticatable;

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'two_factor_confirmed_at' => 'datetime',
        ];
    }

    /**
     * @return BelongsToMany<Organization, $this>
     */
    public function organizations(): BelongsToMany
    {
        return $this->belongsToMany(Organization::class)
            ->withPivot('role')
            ->withTimestamps();
    }

    /**
     * @return BelongsTo<Organization, $this>
     */
    public function currentOrganization(): BelongsTo
    {
        return $this->belongsTo(Organization::class, 'current_organization_id');
    }

    /**
     * Resolve the active organization, self-healing when the stored one is no
     * longer a membership (for example after the user was removed from it).
     */
    public function resolveCurrentOrganization(): ?Organization
    {
        $this->loadMissing('organizations');

        $current = $this->organizations->firstWhere('id', $this->current_organization_id);

        if ($current !== null) {
            return $current;
        }

        $fallback = $this->organizations->first();

        if ($fallback === null) {
            if ($this->current_organization_id !== null) {
                $this->forceFill(['current_organization_id' => null])->save();
            }

            return null;
        }

        $this->forceFill(['current_organization_id' => $fallback->id])->save();

        return $fallback;
    }

    public function belongsToOrganization(Organization|int|null $organization): bool
    {
        return $this->roleIn($organization) !== null;
    }

    public function roleIn(Organization|int|null $organization): ?string
    {
        $organizationId = $organization instanceof Organization ? $organization->id : $organization;

        if ($organizationId === null) {
            return null;
        }

        $this->loadMissing('organizations');

        return $this->organizations->firstWhere('id', $organizationId)?->getAttribute('pivot')->role;
    }

    /**
     * @param  array<int, string>  $roles
     */
    public function hasOrganizationRole(Organization|int|null $organization, array $roles): bool
    {
        $role = $this->roleIn($organization);

        return $role !== null && in_array($role, $roles, true);
    }

    public function switchOrganization(Organization $organization): bool
    {
        if (! $this->belongsToOrganization($organization)) {
            return false;
        }

        // current_organization_id is intentionally not mass-assignable, so that
        // a crafted profile update cannot move a user between organizations.
        $this->forceFill(['current_organization_id' => $organization->id])->save();

        return true;
    }
}
