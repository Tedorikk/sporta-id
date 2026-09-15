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
 * organiser's player form and the captain's public roster portal, so the
 * jersey, certificate and phone rules exist once.
 */
class RosterService
{
    /**
     * Validation rules for one roster member.
     *
     * The public portal is strict: a tournament entry needs the identity
     * document, birth details and a WhatsApp number for every member, and a
     * photo for the ID card. Organisers editing on a team's behalf keep the
     * lenient rules so a half-known walk-in can still be recorded.
     */
    public function rules(Request $request, Team $team, ?Player $player = null, bool $strict = false): array
    {
        $required = $strict ? 'required' : 'nullable';

        return [
            'name' => ['required', 'string', 'max:255'],
            'role' => ['required', Rule::in(Player::ROLES)],
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
            'position' => ['nullable', 'string', 'max:255'],
            'photo' => [$required, 'url', 'max:255'],
            'certificate' => [
                Rule::requiredIf(fn () => $request->input('role') === Player::ROLE_MEDIC),
                'nullable',
                'url',
                'max:255',
            ],
            'identity_card' => [$required, 'url', 'max:255'],
            'birthplace' => [$required, 'string', 'max:255'],
            'dob' => [$required, 'date', 'before:today'],
            'phone_number' => [$required, 'string', 'regex:/^\+[1-9]\d{1,14}$/'],
            'email' => ['nullable', 'email', 'max:255'],
        ];
    }

    /** @return array<string, string> */
    public function messages(): array
    {
        return [
            'phone_number.regex' => 'Use international format, e.g. +628123456789.',
            'identity_card.required' => 'Upload an identity document (KTP, KK or akta).',
            'photo.required' => 'Upload a photo for the ID card.',
        ];
    }

    /** @return array<string, string> */
    public function attributes(): array
    {
        return [
            'dob' => 'date of birth',
            'birthplace' => 'place of birth',
            'phone_number' => 'WhatsApp number',
            'jersey_number' => 'jersey number',
        ];
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
