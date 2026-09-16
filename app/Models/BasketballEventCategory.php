<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;

class BasketballEventCategory extends Model
{
    use HasFactory;

    public const FORMAT_ROUND_ROBIN = 'round_robin';

    public const FORMAT_POOL_STAGE = 'pool_stage';

    /** Mirrors the `format` enum on basketball_event_categories. */
    public const FORMATS = [
        self::FORMAT_ROUND_ROBIN,
        self::FORMAT_POOL_STAGE,
    ];

    /**
     * Tournament configuration only. Price, quota and the open/closed window
     * belong to the registration category this row extends — see
     * registrationCategory() — so there is a single thing a visitor buys.
     */
    protected $fillable = [
        'basketball_event_id', 'registration_category_id', 'name', 'slug', 'format', 'win_points', 'loss_points',
        'min_team', 'min_player_per_team', 'max_player_per_team',
        'max_player_per_coach', 'roster_closes_at',
    ];

    protected $casts = [
        'win_points' => 'integer',
        'loss_points' => 'integer',
        'min_team' => 'integer',
        'min_player_per_team' => 'integer',
        'max_player_per_team' => 'integer',
        'max_player_per_coach' => 'integer',
        'roster_closes_at' => 'datetime',
    ];

    /**
     * The form a freshly minted basketball category sells through. Team name
     * is the built-in field; the rest is what a tournament entry collects:
     * where the team is from, its officials and players (the roster block —
     * answers become the team sheet, not form_data), bank-transfer evidence
     * for organisers who settle fees outside Midtrans, and the paperwork.
     * Everything here is editable in the builder.
     *
     * @return array<int, array<string, mixed>>
     */
    public static function defaultFormPages(): array
    {
        return [
            [
                'key' => 'data-tim',
                'title' => 'Data Tim',
                'fields' => [
                    [
                        'key' => 'asal_kabupaten_kota',
                        'label' => 'Asal Kabupaten/Kota',
                        'type' => 'text',
                        'required' => true,
                    ],
                    [
                        'key' => 'team_logo',
                        'label' => 'Logo Tim',
                        'type' => 'file',
                        'required' => true,
                        'image_ratio' => 'square',
                        'help_text' => "Gunakan gambar dengan latar belakang transparan.\nGambar tidak dapat diganti di kemudian hari.\nCrop gambar sesuai dengan grid.",
                    ],
                ],
            ],
            [
                'key' => 'data-peserta',
                'title' => 'Data Official & Peserta',
                'fields' => [
                    [
                        'key' => 'roster',
                        'label' => 'Official & Pemain',
                        'type' => 'roster',
                        'required' => true,
                        'details_on_form' => false,
                        'help_text' => 'Daftarkan official dan pemain tim Anda.',
                        'slots' => [
                            ['role' => 'manager', 'label' => 'Manager', 'min' => 1, 'max' => 1],
                            ['role' => 'coach', 'label' => 'Coach', 'min' => 1, 'max' => 1],
                            ['role' => 'assistant_coach', 'label' => 'Ass. Coach', 'min' => 1, 'max' => 1],
                            ['role' => 'player', 'label' => 'Pemain', 'min' => 7, 'max' => 12],
                        ],
                        'member_fields' => [
                            ['key' => 'asal_sekolah', 'label' => 'Asal Sekolah', 'type' => 'text', 'required' => true],
                            ['key' => 'kelas', 'label' => 'Kelas', 'type' => 'text', 'required' => true],
                        ],
                    ],
                ],
            ],
            [
                'key' => 'pembayaran',
                'title' => 'Pembayaran',
                'fields' => [
                    [
                        'key' => 'bukti_pembayaran',
                        'label' => 'Bukti Pembayaran',
                        'type' => 'document',
                        'required' => true,
                        'help_text' => 'Unggah bukti transfer biaya pendaftaran tim.',
                    ],
                    [
                        'key' => 'nama_rekening_pembayaran',
                        'label' => 'Nama Rekening yang Melakukan Pembayaran',
                        'type' => 'text',
                        'required' => true,
                    ],
                ],
            ],
            [
                'key' => 'dokumen',
                'title' => 'Dokumen',
                'fields' => [
                    [
                        'key' => 'surat_pernyataan',
                        'label' => 'Surat Pernyataan',
                        'type' => 'document',
                        'required' => true,
                    ],
                    [
                        'key' => 'lisensi_tim_medis',
                        'label' => 'Lisensi/Sertifikat Tim Medis',
                        'type' => 'document',
                        'required' => false,
                    ],
                ],
            ],
        ];
    }

    protected static function boot()
    {
        parent::boot();

        static::creating(function ($category) {
            if (empty($category->slug)) {
                $category->slug = Str::slug($category->name).'-'.Str::lower(Str::random(4));
            }
        });
    }

    /** @return BelongsTo<BasketballEvent, $this> */
    public function basketballEvent(): BelongsTo
    {
        return $this->belongsTo(BasketballEvent::class);
    }

    /** @return BelongsTo<RegistrationCategory, $this> */
    public function registrationCategory(): BelongsTo
    {
        return $this->belongsTo(RegistrationCategory::class);
    }

    /** @return HasMany<Team, $this> */
    public function teams(): HasMany
    {
        return $this->hasMany(Team::class);
    }

    /** @return HasMany<Pool, $this> */
    public function pools(): HasMany
    {
        return $this->hasMany(Pool::class);
    }

    /** @return HasMany<GameMatch, $this> */
    public function matches(): HasMany
    {
        return $this->hasMany(GameMatch::class);
    }

    public function isRoundRobin(): bool
    {
        return $this->format === self::FORMAT_ROUND_ROBIN;
    }

    /**
     * Whether captains may still add or edit roster members. Falls back to the
     * registration category's closing time when no separate roster deadline is
     * set, so a category that stopped selling also stops taking roster changes.
     */
    public function rosterIsOpen(): bool
    {
        $closesAt = $this->roster_closes_at ?? $this->registrationCategory?->closes_at;

        return $closesAt === null || now()->lte($closesAt);
    }
}
