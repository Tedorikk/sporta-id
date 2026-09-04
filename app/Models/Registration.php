<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;

class Registration extends Model
{
    use HasFactory;

    public const STATUS_PENDING_PAYMENT = 'pending_payment';

    public const STATUS_CONFIRMED = 'confirmed';

    public const STATUS_REJECTED = 'rejected';

    public const STATUS_CANCELLED = 'cancelled';

    public const STATUS_EXPIRED = 'expired';

    public const STATUSES = [
        self::STATUS_PENDING_PAYMENT,
        self::STATUS_CONFIRMED,
        self::STATUS_REJECTED,
        self::STATUS_CANCELLED,
        self::STATUS_EXPIRED,
    ];

    /**
     * Alphabet for verification codes: digits and capitals with the pairs a
     * person misreads off a printed badge removed — 0/O, 1/I/L. Someone at a
     * door is comparing two strings by eye, so an ambiguous glyph costs more
     * than the handful of combinations it buys.
     */
    private const CODE_ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';

    protected $fillable = [
        'registration_category_id', 'event_id', 'team_id', 'name', 'email',
        'phone', 'photo', 'qr_token', 'verification_code', 'form_data',
        'status', 'expires_at',
    ];

    protected $casts = [
        'form_data' => 'array',
        'expires_at' => 'datetime',
    ];

    protected static function boot()
    {
        parent::boot();

        static::creating(function (self $registration) {
            if (empty($registration->qr_token)) {
                $registration->qr_token = (string) Str::uuid();
            }
            if (empty($registration->verification_code)) {
                $registration->verification_code = self::generateVerificationCode();
            }
            if (empty($registration->status)) {
                $registration->status = self::STATUS_PENDING_PAYMENT;
            }
        });
    }

    /**
     * Short code printed on the ID card and shown again on the page the card's
     * QR opens, so whoever is working the door can check that the badge in
     * their hand is the one the record describes.
     *
     * It is not a secret and it is not what authenticates the scan — the
     * qr_token in the URL does that. This exists so a card that was copied,
     * altered or printed from a stale sheet fails an eyeball comparison.
     * Collisions between two registrations are therefore harmless: each card's
     * code is only ever compared against its own record.
     */
    public static function generateVerificationCode(): string
    {
        $pick = fn (int $length) => collect(range(1, $length))
            ->map(fn () => self::CODE_ALPHABET[random_int(0, strlen(self::CODE_ALPHABET) - 1)])
            ->implode('');

        // Grouped, because two three-character runs are far easier to compare
        // by eye than one run of six.
        return $pick(3).'-'.$pick(3);
    }

    /** Issues a fresh code, which stops every card printed before now verifying. */
    public function rotateVerificationCode(): string
    {
        $code = self::generateVerificationCode();

        $this->forceFill(['verification_code' => $code])->save();

        return $code;
    }

    /**
     * Resolves a registration from either its numeric id or its qr_token.
     *
     * Public URLs are keyed on qr_token so registrations can't be enumerated,
     * but ID cards issued before that change encode the numeric id in their QR
     * code. Staff-side lookups (the gate scanner, meeting check-in) accept
     * both so those cards keep working; public routes accept only the token.
     */
    public static function findByIdOrToken(string $identifier): ?self
    {
        return ctype_digit($identifier)
            ? static::find((int) $identifier)
            : static::where('qr_token', $identifier)->first();
    }

    /** @return BelongsTo<RegistrationCategory, $this> */
    public function registrationCategory(): BelongsTo
    {
        return $this->belongsTo(RegistrationCategory::class);
    }

    /** @return BelongsTo<Event, $this> */
    public function event(): BelongsTo
    {
        return $this->belongsTo(Event::class);
    }

    /** @return BelongsTo<Team, $this> */
    public function team(): BelongsTo
    {
        return $this->belongsTo(Team::class);
    }

    /** @return HasMany<Payment, $this> */
    public function payments(): HasMany
    {
        return $this->hasMany(Payment::class);
    }

    public function latestPayment(): ?Payment
    {
        return $this->payments->sortByDesc('id')->first();
    }

    /** @return HasMany<MeetingCheckIn, $this> */
    public function meetingCheckIns(): HasMany
    {
        return $this->hasMany(MeetingCheckIn::class);
    }
}
