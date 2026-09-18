<?php

namespace App\Services\TeamMembers;

use App\Models\Player;
use App\Models\Registration;
use App\Models\Team;
use Closure;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

/**
 * The non-basketball counterpart to RosterService: a team category's
 * "Organize Members" block. Same slot/min/max shape, but the role is
 * whatever the organiser typed on the block (not Player::ROLES), and no
 * jersey number, identity document or birth details are ever asked —
 * those only make sense for a tournament entry. Kept fully separate from
 * RosterService so the basketball roster is never touched by this.
 */
class TeamMemberService
{
    /**
     * Validation rules for one member being added or edited on an existing
     * team, given the block's own list of role slots.
     *
     * @param  array<string, mixed>  $block
     */
    public function rules(array $block): array
    {
        $roles = collect($block['slots'] ?? [])->pluck('role')->unique()->values()->all();

        return [
            ...$this->memberRules($block['member_fields'] ?? [], fn (string $rule) => $rule),
            'role' => ['required', Rule::in($roles)],
        ];
    }

    /**
     * Rules for the whole member list submitted with a registration, as
     * `members.*.<field>`.
     *
     * @param  array<string, mixed>  $block
     */
    public function submissionRules(array $block): array
    {
        $roles = collect($block['slots'] ?? [])->pluck('role')->unique()->values()->all();
        $prefix = fn (string $rule) => "members.*.{$rule}";

        return [
            'members' => ['required', 'array'],
            ...$this->memberRules($block['member_fields'] ?? [], $prefix),
            'members.*.role' => ['required', Rule::in($roles)],
        ];
    }

    /**
     * @param  array<int, array<string, mixed>>  $memberFields
     * @param  Closure(string): string  $prefix
     */
    private function memberRules(array $memberFields, Closure $prefix): array
    {
        $rules = [
            $prefix('name') => ['required', 'string', 'max:255'],
            $prefix('photo') => ['required', 'url', 'max:255'],
            $prefix('phone_number') => ['required', 'string', 'regex:/^\+[1-9]\d{1,14}$/'],
            $prefix('email') => ['nullable', 'email', 'max:255'],
            $prefix('extra') => ['nullable', 'array'],
        ];

        foreach ($memberFields as $field) {
            $roles = $field['roles'] ?? [];
            $requiredRule = match (true) {
                ! ($field['required'] ?? false) => 'nullable',
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
            'members.*.phone_number.regex' => __('Use international format, e.g. +628123456789.'),
            'photo.required' => __('Upload a photo for the ID card.'),
            'members.*.photo.required' => __('Upload a photo for the ID card.'),
        ];
    }

    /** @return array<string, string> */
    public function attributes(array $memberFields = []): array
    {
        $attributes = ['phone_number' => __('WhatsApp number')];

        foreach ($memberFields as $field) {
            $attributes['extra.'.$field['key']] = strtolower($field['label'] ?? $field['key']);
        }

        foreach ($attributes as $key => $label) {
            $attributes["members.*.{$key}"] = $label;
        }

        return $attributes;
    }

    /**
     * Whether an extra question is asked of this role.
     *
     * @param  array<string, mixed>  $field
     */
    public function fieldAppliesTo(array $field, string $role): bool
    {
        $roles = $field['roles'] ?? [];

        return $roles === [] || in_array($role, $roles, true);
    }

    /** Whether a member carries a photo and WhatsApp number, plus every required extra question. */
    public function isComplete(Player $player, array $memberFields = []): bool
    {
        if (blank($player->photo) || blank($player->phone_number)) {
            return false;
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
     * Each role the block lists, how many the team has and how many it may
     * have.
     *
     * @param  array<string, mixed>  $block
     * @return array<int, array{role: string, label: string, min: int, max: int|null, count: int}>
     */
    public function slots(Team $team, array $block): array
    {
        $counts = $team->players->countBy('role');

        return collect($block['slots'] ?? [])->map(fn (array $slot) => [
            'role' => $slot['role'],
            'label' => $slot['label'] ?? $slot['role'],
            'min' => (int) ($slot['min'] ?? 0),
            'max' => isset($slot['max']) ? (int) $slot['max'] : null,
            'count' => (int) $counts->get($slot['role'], 0),
        ])->values()->all();
    }

    /**
     * @param  array<string, mixed>  $block
     * @return array{members: int, incomplete: int, complete: bool, slots: array<int, array<string, mixed>>, full: bool}
     */
    public function summary(Team $team, array $block): array
    {
        $memberFields = $block['member_fields'] ?? [];
        $slots = $this->slots($team, $block);
        $incomplete = $team->players->reject(fn (Player $p) => $this->isComplete($p, $memberFields))->count();

        return [
            'members' => $team->players->count(),
            'incomplete' => $incomplete,
            'complete' => $incomplete === 0 && collect($slots)->every(fn (array $slot) => $slot['count'] >= $slot['min']),
            'slots' => $slots,
            'full' => $slots !== [] && collect($slots)->every(fn (array $slot) => $slot['max'] !== null && $slot['count'] >= $slot['max']),
        ];
    }

    /**
     * Checks a submitted member list against the block's slots.
     *
     * @param  array<int, array<string, mixed>>  $members
     * @param  array<string, mixed>  $block
     */
    public function assertSubmissionFits(array $members, array $block): void
    {
        $errors = [];
        $byRole = collect($members)->groupBy('role');

        foreach ($block['slots'] ?? [] as $slot) {
            $label = $slot['label'] ?? $slot['role'];
            $count = $byRole->get($slot['role'], collect())->count();
            $min = (int) ($slot['min'] ?? 0);
            $max = $slot['max'] ?? null;

            if ($count < $min) {
                $errors['members'][] = __('At least :min :label required.', ['min' => $min, 'label' => $label]);
            } elseif ($max !== null && $count > (int) $max) {
                $errors['members'][] = __('At most :max :label allowed.', ['max' => (int) $max, 'label' => $label]);
            }
        }

        if ($errors !== []) {
            throw ValidationException::withMessages($errors);
        }
    }

    /**
     * Why the member list can't be edited right now, or null when it can.
     * Mirrors RosterService::lockReason() minus the tournament case.
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

    /** Refuses to add a member to a role slot that is already full. */
    public function assertHasRoomFor(Team $team, array $block, string $role): void
    {
        $slot = collect($this->slots($team, $block))->firstWhere('role', $role);

        if ($slot === null || $slot['max'] === null || $slot['count'] < $slot['max']) {
            return;
        }

        throw ValidationException::withMessages([
            'role' => __('This team already has the maximum of :max :label.', ['max' => $slot['max'], 'label' => $slot['label']]),
        ]);
    }
}
