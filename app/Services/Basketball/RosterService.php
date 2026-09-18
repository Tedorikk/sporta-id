<?php

namespace App\Services\Basketball;

use App\Models\Player;
use App\Models\Registration;
use App\Models\Team;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

/**
 * Everything that decides who may be on a team sheet — shared by the
 * registration form's roster block, the organiser's player form and the
 * captain's public roster portal, so the jersey, certificate, phone and
 * per-member extra-question rules exist once.
 */
class RosterService
{
    /**
     * Validation rules for one roster member being added or edited on an
     * existing team.
     *
     * The public portal is strict: a tournament entry needs the identity
     * document, birth details, a WhatsApp number and a photo for every
     * member. Organisers editing on a team's behalf keep the lenient rules so
     * a half-known walk-in can still be recorded. A team outside a tournament
     * has no bracket to feed, so its jersey number and identity/birth details
     * are never required — only what applies to any team (name, role, photo,
     * phone) and whatever the organiser asked for in member_fields.
     */
    public function rules(Request $request, Team $team, ?Player $player = null, bool $strict = false): array
    {
        $isTournament = $team->basketballEventCategory !== null;

        return [
            ...$this->memberRules($strict, $isTournament, $team->rosterMemberFields(), fn (string $rule) => $rule),
            'jersey_number' => [
                Rule::requiredIf(fn () => $isTournament && $request->input('role', Player::ROLE_PLAYER) === Player::ROLE_PLAYER),
                'nullable',
                'string',
                'max:3',
                function (string $attribute, mixed $value, Closure $fail) use ($team, $player) {
                    if ($value === null) {
                        return;
                    }

                    $exists = $team->players()
                        ->where('jersey_number', $value)
                        ->when($player, fn ($q) => $q->where('players.id', '!=', $player->id))
                        ->exists();

                    if ($exists) {
                        $fail('The jersey number has already been taken for this team.');
                    }
                },
            ],
            // A medic's licence is welcome but not a condition of entry.
            'certificate' => ['nullable', 'url', 'max:255'],
        ];
    }

    /**
     * Rules for the whole roster submitted with a registration, as
     * `roster.*.<field>` — the block's slots decide which roles may appear
     * and its member_fields which extra answers each member carries.
     *
     * With `details_on_form` off the form only takes name, role and jersey;
     * photos, documents and birth details are completed in the portal, so
     * they are optional here (see RegistrationCategory::rosterDetailsOnForm()).
     *
     * @param  array<string, mixed>  $rosterField  The category's roster block definition.
     */
    public function submissionRules(array $rosterField, bool $isTournament = true): array
    {
        $roles = collect($rosterField['slots'] ?? [])->pluck('role')->unique()->values()->all();
        $prefix = fn (string $rule) => "roster.*.{$rule}";
        $strict = (bool) ($rosterField['details_on_form'] ?? true);

        return [
            'roster' => ['required', 'array'],
            ...$this->memberRules($strict, $isTournament, $rosterField['member_fields'] ?? [], $prefix),
            'roster.*.role' => ['required', Rule::in($roles)],
            // `nullable` short-circuits for staff, so `distinct` only compares the players' numbers.
            'roster.*.jersey_number' => [
                $isTournament ? 'required_if:roster.*.role,'.Player::ROLE_PLAYER : 'nullable',
                'nullable', 'string', 'max:3', 'distinct',
            ],
            'roster.*.certificate' => ['nullable', 'url', 'max:255'],
        ];
    }

    /**
     * Whether a member carries everything they need — photo and a WhatsApp
     * number for any team, plus (in a tournament) the identity document,
     * birth details and a jersey for players — and an answer to every
     * required extra question (a medic's licence is optional). A member
     * added without details on the form stays incomplete until they are
     * filled in.
     *
     * @param  array<int, array<string, mixed>>  $memberFields
     */
    public function isComplete(Player $player, array $memberFields = [], bool $isTournament = true): bool
    {
        $fixed = [$player->photo, $player->phone_number];

        if ($isTournament) {
            $fixed[] = $player->identity_card;
            $fixed[] = $player->birthplace;
            $fixed[] = $player->dob;

            if ($player->role === Player::ROLE_PLAYER) {
                $fixed[] = $player->jersey_number;
            }
        }

        foreach ($fixed as $value) {
            if (blank($value)) {
                return false;
            }
        }

        foreach ($memberFields as $field) {
            if (! $this->fieldAppliesTo($field, $player->role)) {
                continue;
            }

            if (($field['required'] ?? false) && blank(data_get($player->extra, $field['key']))) {
                return false;
            }
        }

        return true;
    }

    /**
     * Whether an extra question is asked of this role. A question with no
     * `roles` is asked of everyone; "Asal Sekolah" with roles [player] is
     * skipped for the coach.
     *
     * @param  array<string, mixed>  $field
     */
    public function fieldAppliesTo(array $field, string $role): bool
    {
        $roles = $field['roles'] ?? [];

        return $roles === [] || in_array($role, $roles, true);
    }

    /**
     * The per-member rules every entry point shares. `$prefix` turns a bare
     * field name into the attribute path the caller validates under. The
     * identity document and birth details only matter for a tournament
     * entry (age-group eligibility, the bracket's ID cards) — a plain team
     * never requires them, whatever `$strict` says.
     *
     * @param  array<int, array<string, mixed>>  $memberFields
     * @param  Closure(string): string  $prefix
     */
    private function memberRules(bool $strict, bool $isTournament, array $memberFields, Closure $prefix): array
    {
        $required = $strict ? 'required' : 'nullable';
        $tournamentRequired = $strict && $isTournament ? 'required' : 'nullable';

        $rules = [
            $prefix('name') => ['required', 'string', 'max:255'],
            $prefix('role') => ['required', Rule::in(Player::ROLES)],
            $prefix('position') => ['nullable', 'string', 'max:255'],
            $prefix('photo') => [$required, 'url', 'max:255'],
            $prefix('identity_card') => [$tournamentRequired, 'url', 'max:255'],
            $prefix('birthplace') => [$tournamentRequired, 'string', 'max:255'],
            $prefix('dob') => [$tournamentRequired, 'date', 'before:today'],
            $prefix('phone_number') => [$required, 'string', 'regex:/^\+[1-9]\d{1,14}$/'],
            $prefix('email') => ['nullable', 'email', 'max:255'],
            $prefix('extra') => ['nullable', 'array'],
        ];

        foreach ($memberFields as $field) {
            // Required only for the roles the question is asked of; the
            // role sits next to it under the same prefix (`roster.*.role`
            // resolves per entry), so required_if does the narrowing.
            $roles = $field['roles'] ?? [];
            $requiredRule = match (true) {
                ! ($field['required'] ?? false) || ! $strict => 'nullable',
                $roles === [] => 'required',
                default => 'required_if:'.$prefix('role').','.implode(',', $roles),
            };

            $rules[$prefix('extra.'.$field['key'])] = [
                $requiredRule,
                'nullable',
                ...match ($field['type'] ?? 'text') {
                    'number' => ['numeric'],
                    'date' => ['date'],
                    'select' => [Rule::in($field['options'] ?? [])],
                    'phone' => ['string', 'max:50', 'regex:/^[0-9+\-\s()]{6,25}$/'],
                    default => ['string', 'max:255'],
                },
            ];
        }

        return $rules;
    }

    /** @return array<string, string> */
    public function messages(): array
    {
        return [
            'phone_number.regex' => __('Use international format, e.g. +628123456789.'),
            'roster.*.phone_number.regex' => __('Use international format, e.g. +628123456789.'),
            'identity_card.required' => __('Upload an identity document (KTP, KK or akta).'),
            'roster.*.identity_card.required' => __('Upload an identity document (KTP, KK or akta).'),
            'photo.required' => __('Upload a photo for the ID card.'),
            'roster.*.photo.required' => __('Upload a photo for the ID card.'),
            'roster.*.jersey_number.required_if' => __('Every player needs a jersey number.'),

            'roster.*.jersey_number.distinct' => __('Two players share this jersey number.'),
        ];
    }

    /**
     * Friendly names for the fixed fields plus whatever the organiser called
     * the extra questions.
     *
     * @param  array<int, array<string, mixed>>  $memberFields
     * @return array<string, string>
     */
    public function attributes(array $memberFields = []): array
    {
        $attributes = [
            'dob' => __('date of birth'),
            'birthplace' => __('place of birth'),
            'phone_number' => __('WhatsApp number'),
            'jersey_number' => __('jersey number'),
            'identity_card' => __('identity document'),
        ];

        foreach ($memberFields as $field) {
            $attributes['extra.'.$field['key']] = strtolower($field['label'] ?? $field['key']);
        }

        // The same names under the roster block's array path.
        foreach ($attributes as $key => $label) {
            $attributes["roster.*.{$key}"] = $label;
        }

        return $attributes;
    }

    /**
     * Checks a submitted roster against the block's slots: how many of each
     * role it must and may contain.
     *
     * @param  array<int, array<string, mixed>>  $members
     * @param  array<string, mixed>  $rosterField
     */
    public function assertSubmissionFits(array $members, array $rosterField): void
    {
        $errors = [];
        $byRole = collect($members)->groupBy('role');

        foreach ($rosterField['slots'] ?? [] as $slot) {
            $label = $slot['label'] ?? ucfirst(str_replace('_', ' ', $slot['role']));
            $count = $byRole->get($slot['role'], collect())->count();
            $min = (int) ($slot['min'] ?? 0);
            $max = $slot['max'] ?? null;

            if ($count < $min) {
                $errors['roster'][] = __('At least :min :label required.', ['min' => $min, 'label' => $label]);
            } elseif ($max !== null && $count > (int) $max) {
                $errors['roster'][] = __('At most :max :label allowed.', ['max' => (int) $max, 'label' => $label]);
            }
        }

        if ($errors !== []) {
            throw ValidationException::withMessages($errors);
        }
    }

    /**
     * Refuses to add a member to a role whose slot is already full — the
     * players' cap from the tournament, and any staff slot the roster block
     * limits (one coach, one manager…). A role the block doesn't mention
     * has no cap, so an organiser can still record a walk-in.
     */
    public function assertHasRoomFor(Team $team, string $role): void
    {
        $slot = collect($this->slots($team))->firstWhere('role', $role);

        if ($slot === null || $slot['max'] === null || $slot['count'] < $slot['max']) {
            return;
        }

        throw ValidationException::withMessages([
            'role' => __('This team already has the maximum of :max :label.', ['max' => $slot['max'], 'label' => $slot['label']]),
        ]);
    }

    /**
     * Each role a team may enter, how many it has and how many it may have —
     * from the registration form's roster block (whose player slot follows
     * the tournament limits), or just the tournament's player limits when
     * the form has no block. What the portal uses to lock "Add member" and
     * the role picker once a slot is full.
     *
     * @return array<int, array{role: string, label: string, min: int, max: int|null, count: int}>
     */
    public function slots(Team $team): array
    {
        $tournament = $team->basketballEventCategory;
        $block = $team->registrationCategory()?->rosterField();
        $counts = $team->players->countBy('role');

        $slots = $block !== null
            ? ($block['slots'] ?? [])
            : [[
                'role' => Player::ROLE_PLAYER,
                'label' => 'Player',
                'min' => (int) ($tournament?->min_player_per_team ?? 0),
                'max' => $tournament?->max_player_per_team,
            ]];

        return collect($slots)->map(fn (array $slot) => [
            'role' => $slot['role'],
            'label' => $slot['label'] ?? ucfirst(str_replace('_', ' ', $slot['role'])),
            'min' => (int) ($slot['min'] ?? 0),
            'max' => isset($slot['max']) ? (int) $slot['max'] : null,
            'count' => (int) $counts->get($slot['role'], 0),
        ])->values()->all();
    }

    /**
     * Where the roster stands against the category's limits — what the portal
     * shows the captain and what verification checks. `complete` means enough
     * players *and* nobody still missing their details.
     *
     * @return array{players: int, staff: int, incomplete: int, min_players: int|null, max_players: int|null, complete: bool, slots: array<int, array<string, mixed>>, full: bool}
     */
    public function summary(Team $team): array
    {
        $members = $team->players;
        $players = $members->where('role', Player::ROLE_PLAYER)->count();
        $incomplete = $this->incompleteCount($team);
        $slots = $this->slots($team);
        $playerSlot = collect($slots)->firstWhere('role', Player::ROLE_PLAYER);
        // A slot with no minimum reports 0 rather than null; treat that as
        // "no requirement" so a plain team category (no block, no tournament)
        // doesn't tell the captain to recruit "at least 0 players".
        $min = $playerSlot !== null && $playerSlot['min'] > 0 ? $playerSlot['min'] : null;
        $max = $playerSlot['max'] ?? null;

        return [
            'players' => $players,
            'staff' => $members->count() - $players,
            'incomplete' => $incomplete,
            'min_players' => $min,
            'max_players' => $max,
            'complete' => ($min === null || $players >= $min) && $incomplete === 0,
            'slots' => $slots,
            // Nobody else can be added: every slot has a ceiling and has reached it.
            'full' => $slots !== [] && collect($slots)->every(fn (array $slot) => $slot['max'] !== null && $slot['count'] >= $slot['max']),
        ];
    }

    /** How many of the team's members are still missing details (see isComplete()). */
    public function incompleteCount(Team $team): int
    {
        $memberFields = $team->rosterMemberFields();
        $isTournament = $team->basketballEventCategory !== null;

        return $team->players->reject(fn (Player $player) => $this->isComplete($player, $memberFields, $isTournament))->count();
    }

    /**
     * Why the roster can't be edited right now, or null when it can. Shared
     * by the manager's portal and a member's own self-fill page: the page
     * shows this instead of the form, and writes refuse with it.
     */
    public function lockReason(Registration $registration, Team $team): ?string
    {
        if ($registration->status === Registration::STATUS_PENDING_PAYMENT) {
            return 'payment_pending';
        }

        if ($registration->isWithdrawn()) {
            return 'withdrawn';
        }

        if ($team->status === Team::STATUS_VERIFIED) {
            return 'verified';
        }

        if ($team->rosterLocked()) {
            return 'closed';
        }

        return null;
    }

    /**
     * The member's self-fill secret for this team, minted on first use. It
     * lives on the pivot because a person can be on several teams and the
     * link must open one sheet; and apart from players.qr_token, which is
     * printed on ID cards and must never double as a write credential.
     */
    public function inviteTokenFor(Team $team, Player $player): string
    {
        $existing = DB::table('player_team')
            ->where('team_id', $team->id)
            ->where('player_id', $player->id)
            ->value('invite_token');

        return $existing ?? $this->regenerateInviteToken($team, $player);
    }

    /** A fresh secret — the old link stops working at once. */
    public function regenerateInviteToken(Team $team, Player $player): string
    {
        $token = Str::random(48);

        DB::table('player_team')
            ->where('team_id', $team->id)
            ->where('player_id', $player->id)
            ->update(['invite_token' => $token, 'updated_at' => now()]);

        return $token;
    }

    /**
     * The team and member a self-fill link points at, or null for a token
     * nobody holds (revoked, or never issued).
     *
     * @return array{team: Team, player: Player}|null
     */
    public function memberByInviteToken(string $token): ?array
    {
        $row = DB::table('player_team')->where('invite_token', $token)->first(['team_id', 'player_id']);

        if ($row === null) {
            return null;
        }

        $team = Team::find($row->team_id);
        $player = Player::find($row->player_id);

        return $team && $player ? ['team' => $team, 'player' => $player] : null;
    }
}
