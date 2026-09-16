<?php

namespace App\Models;

use Carbon\CarbonInterface;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;

/**
 * One distance of a running event — a 5K, a 10K, a half marathon: its start
 * time, cut-off and bib ranges. Runners buy a {@see RegistrationCategory}
 * that names this distance ("5K with jersey", "5K without jersey" can both
 * feed the same start list), and land here as {@see RaceParticipant} rows
 * once their registration is confirmed.
 */
class RunningEventCategory extends Model
{
    use HasFactory;

    public const GENDER_MALE = 'male';

    public const GENDER_FEMALE = 'female';

    public const GENDERS = [self::GENDER_MALE, self::GENDER_FEMALE];

    /**
     * Race configuration only. Price, quota and the open/closed window
     * belong to the registration categories that sell this distance.
     */
    protected $fillable = [
        'running_event_id', 'name', 'slug', 'distance_meters', 'start_at',
        'cutoff_minutes', 'bib_prefix', 'bib_start_number', 'bib_start_male',
        'bib_start_female', 'minimum_age',
    ];

    protected $casts = [
        'distance_meters' => 'integer',
        'start_at' => 'datetime',
        'cutoff_minutes' => 'integer',
        'bib_start_number' => 'integer',
        'bib_start_male' => 'integer',
        'bib_start_female' => 'integer',
        'minimum_age' => 'integer',
    ];

    protected $attributes = [
        'bib_start_number' => 1,
    ];

    /**
     * The form a freshly minted race category sells through: who the runner
     * is, what the bib sequence and age check need (gender, date of birth),
     * jersey size, the face photo that goes on the ID card, and the identity
     * card race-pack collection checks against. Everything here is editable
     * in the builder.
     *
     * @return array<int, array<string, mixed>>
     */
    public static function defaultFormPages(): array
    {
        return [
            [
                'key' => 'data-pelari',
                'title' => 'Data Pelari',
                'fields' => [
                    ['key' => 'email', 'label' => 'Email', 'type' => 'email', 'required' => true],
                    ['key' => 'phone', 'label' => 'No. WhatsApp', 'type' => 'phone', 'required' => true],
                    ['key' => RegistrationCategory::DOB_KEY, 'label' => 'Tanggal Lahir', 'type' => 'date', 'required' => true],
                    ['key' => RegistrationCategory::GENDER_KEY, 'label' => 'Jenis Kelamin', 'type' => RegistrationCategory::GENDER_TYPE, 'required' => true],
                    ['key' => 'nationality', 'label' => 'Kewarganegaraan', 'type' => 'select', 'required' => true, 'options' => ['WNI', 'WNA']],
                    ['key' => 'jersey_size', 'label' => 'Ukuran Jersey', 'type' => 'select', 'required' => true, 'options' => ['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL']],
                    ['key' => 'emergency_contact', 'label' => 'Kontak Darurat', 'type' => 'phone', 'required' => false],
                ],
            ],
            [
                'key' => 'dokumen',
                'title' => 'Foto & Identitas',
                'fields' => [
                    ['key' => 'photo', 'label' => 'Foto Wajah', 'type' => 'file', 'required' => true, 'image_ratio' => 'portrait'],
                    ['key' => 'identity_card', 'label' => 'Kartu Identitas (KTP/Paspor)', 'type' => 'file', 'required' => true, 'image_ratio' => 'landscape'],
                    ['key' => 'agree_rules', 'label' => 'Persetujuan', 'type' => 'checkbox', 'required' => true, 'help_text' => 'Saya telah membaca dan menyetujui peraturan lomba.'],
                ],
            ],
        ];
    }

    protected static function boot(): void
    {
        parent::boot();

        static::creating(function (self $category) {
            if (empty($category->slug)) {
                $category->slug = Str::slug($category->name).'-'.Str::lower(Str::random(4));
            }
        });
    }

    /** @return BelongsTo<RunningEvent, $this> */
    public function runningEvent(): BelongsTo
    {
        return $this->belongsTo(RunningEvent::class);
    }

    /** @return HasMany<RegistrationCategory, $this> */
    public function registrationCategories(): HasMany
    {
        return $this->hasMany(RegistrationCategory::class);
    }

    /** @return HasMany<RaceParticipant, $this> */
    public function participants(): HasMany
    {
        return $this->hasMany(RaceParticipant::class);
    }

    /** Distance in kilometres, the unit every pace and label is expressed in. */
    public function distanceKilometers(): float
    {
        return $this->distance_meters / 1000;
    }

    /**
     * Where this runner's bib sequence begins: the gender-specific start when
     * the organiser set one and the runner's gender is known, else the
     * distance's plain start number.
     */
    public function bibStartFor(?string $gender): int
    {
        $start = match ($gender) {
            self::GENDER_MALE => $this->bib_start_male,
            self::GENDER_FEMALE => $this->bib_start_female,
            default => null,
        };

        return max($start ?? $this->bib_start_number, 1);
    }

    /**
     * The moment a runner's age is measured at: the wave start, else the
     * event day, else whenever they register.
     */
    public function ageReferenceDate(): CarbonInterface
    {
        if ($this->start_at !== null) {
            return $this->start_at;
        }

        $this->loadMissing('runningEvent.event');

        return $this->runningEvent?->event?->start_date ?? now();
    }
}
