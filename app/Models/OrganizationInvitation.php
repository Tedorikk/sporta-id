<?php

namespace App\Models;

use Carbon\CarbonInterface;
use Database\Factories\OrganizationInvitationFactory;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;

/**
 * A standing offer of membership, addressed to an email rather than a user, so
 * that someone with no account yet can still be let in.
 *
 * The token is stored in the clear. Unlike a password reset it grants only the
 * one role the inviter already had the right to hand out, and managers need to
 * re-read the link to pass it on by hand when mail delivery is not set up.
 *
 * @property int $id
 * @property int $organization_id
 * @property string $email
 * @property string $role
 * @property string $token
 * @property int|null $invited_by_id
 * @property CarbonInterface $expires_at
 * @property CarbonInterface|null $accepted_at
 */
class OrganizationInvitation extends Model
{
    /** @use HasFactory<OrganizationInvitationFactory> */
    use HasFactory;

    public const EXPIRY_DAYS = 7;

    protected $fillable = ['email', 'role', 'token', 'invited_by_id', 'expires_at'];

    protected function casts(): array
    {
        return [
            'expires_at' => 'datetime',
            'accepted_at' => 'datetime',
        ];
    }

    /**
     * @return BelongsTo<Organization, $this>
     */
    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function invitedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'invited_by_id');
    }

    /**
     * @param  Builder<$this>  $query
     */
    public function scopePending(Builder $query): void
    {
        $query->whereNull('accepted_at')->where('expires_at', '>', now());
    }

    public function isAccepted(): bool
    {
        return $this->accepted_at !== null;
    }

    public function isExpired(): bool
    {
        return $this->expires_at->isPast();
    }

    public function isPending(): bool
    {
        return ! $this->isAccepted() && ! $this->isExpired();
    }

    public function url(): string
    {
        return route('invitations.show', $this->token);
    }

    public static function freshToken(): string
    {
        return Str::random(64);
    }

    public static function defaultExpiry(): CarbonInterface
    {
        return now()->addDays(self::EXPIRY_DAYS);
    }
}
