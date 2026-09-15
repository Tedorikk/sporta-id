<?php

namespace App\Services\Basketball;

use App\Models\Player;
use App\Models\Team;
use Closure;
use Illuminate\Http\Request;
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
     * a half-known walk-in can still be recorded.
     */
    public function rules(Request $request, Team $team, ?Player $player = null, bool $strict = false): array
    {
        return [
            ...$this->memberRules($strict, $team->rosterMemberFields(), fn (string $rule) => $rule),
            'jersey_number' => [
                Rule::requiredIf(fn () => $request->input('role', Player::ROLE_PLAYER) === Player::ROLE_PLAYER),
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
            'certificate' => [
                Rule::requiredIf(fn () => $request->input('role') === Player::ROLE_MEDIC),
                'nullable',
                'url',
                'max:255',
            ],
        ];
    }

    /**
     * Rules for the whole roster submitted with a registration, as
     * `roster.*.<field>` — the block's slots decide which roles may appear
     * and its member_fields which extra answers each member carries.
     *
     * @param  array<string, mixed>  $rosterField  The category's roster block definition.
     */
    public function submissionRules(array $rosterField): array
    {
        $roles = collect($rosterField['slots'] ?? [])->pluck('role')->unique()->values()->all();
        $prefix = fn (string $rule) => "roster.*.{$rule}";

        return [
            'roster' => ['required', 'array'],
            ...$this->memberRules(true, $rosterField['member_fields'] ?? [], $prefix),
            'roster.*.role' => ['required', Rule::in($roles)],
            // `nullable` short-circuits for staff, so `distinct` only compares the players' numbers.
            'roster.*.jersey_number' => ['required_if:roster.*.role,'.Player::ROLE_PLAYER, 'nullable', 'string', 'max:3', 'distinct'],
            'roster.*.certificate' => ['required_if:roster.*.role,'.Player::ROLE_MEDIC, 'nullable', 'url', 'max:255'],
        ];
    }

    /**
     * The per-member rules every entry point shares. `$prefix` turns a bare
     * field name into the attribute path the caller validates under.
     *
     * @param  array<int, array<string, mixed>>  $memberFields
     * @param  Closure(string): string  $prefix
     */
    private function memberRules(bool $strict, array $memberFields, Closure $prefix): array
    {
        $required = $strict ? 'required' : 'nullable';

        $rules = [
            $prefix('name') => ['required', 'string', 'max:255'],
            $prefix('role') => ['required', Rule::in(Player::ROLES)],
            $prefix('position') => ['nullable', 'string', 'max:255'],
            $prefix('photo') => [$required, 'url', 'max:255'],
            $prefix('identity_card') => [$required, 'url', 'max:255'],
            $prefix('birthplace') => [$required, 'string', 'max:255'],
            $prefix('dob') => [$required, 'date', 'before:today'],
            $prefix('phone_number') => [$required, 'string', 'regex:/^\+[1-9]\d{1,14}$/'],
            $prefix('email') => ['nullable', 'email', 'max:255'],
            $prefix('extra') => ['nullable', 'array'],
        ];

        foreach ($memberFields as $field) {
            $rules[$prefix('extra.'.$field['key'])] = [
                ($field['required'] ?? false) && $strict ? 'required' : 'nullable',
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
            'phone_number.regex' => 'Use international format, e.g. +628123456789.',
            'roster.*.phone_number.regex' => 'Use international format, e.g. +628123456789.',
            'identity_card.required' => 'Upload an identity document (KTP, KK or akta).',
            'roster.*.identity_card.required' => 'Upload an identity document (KTP, KK or akta).',
            'photo.required' => 'Upload a photo for the ID card.',
            'roster.*.photo.required' => 'Upload a photo for the ID card.',
            'roster.*.jersey_number.required_if' => 'Every player needs a jersey number.',
            'roster.*.certificate.required_if' => 'A medic needs a licence or certificate.',
            'roster.*.jersey_number.distinct' => 'Two players share this jersey number.',
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
            'dob' => 'date of birth',
            'birthplace' => 'place of birth',
            'phone_number' => 'WhatsApp number',
            'jersey_number' => 'jersey number',
            'identity_card' => 'identity document',
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
                $errors['roster'][] = "At least {$min} {$label} ".($min === 1 ? 'is' : 'are').' required.';
            } elseif ($max !== null && $count > (int) $max) {
                $errors['roster'][] = "At most {$max} {$label} ".((int) $max === 1 ? 'is' : 'are').' allowed.';
            }
        }

        if ($errors !== []) {
            throw ValidationException::withMessages($errors);
        }
    }

    /**
     * Refuses to add a member that would push the team past the category's
     * player cap. Staff roles don't count towards it.
     */
    public function assertHasRoomFor(Team $team, string $role): void
    {
        $max = $team->basketballEventCategory?->max_player_per_team;

        if ($role !== Player::ROLE_PLAYER || $max === null) {
            return;
        }

        $current = $team->players()->where('role', Player::ROLE_PLAYER)->count();

        if ($current >= $max) {
            throw ValidationException::withMessages([
                'role' => "This team already has the maximum of {$max} players.",
            ]);
        }
    }

    /**
     * Where the roster stands against the category's limits — what the portal
     * shows the captain and what verification checks.
     *
     * @return array{players: int, staff: int, min_players: int|null, max_players: int|null, complete: bool}
     */
    public function summary(Team $team): array
    {
        $members = $team->players;
        $category = $team->basketballEventCategory;
        $players = $members->where('role', Player::ROLE_PLAYER)->count();
        $min = $category?->min_player_per_team;

        return [
            'players' => $players,
            'staff' => $members->count() - $players,
            'min_players' => $min,
            'max_players' => $category?->max_player_per_team,
            'complete' => $min === null || $players >= $min,
        ];
    }
}
