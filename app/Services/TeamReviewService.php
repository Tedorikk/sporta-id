<?php

namespace App\Services;

use App\Models\Player;
use App\Models\Team;
use Illuminate\Support\Collection;

class TeamReviewService
{
    private const MIN_ROSTER_SIZE = 5;

    private const PHONE_PATTERN = '/^\+?[0-9\s-]{8,15}$/';

    public function review(Team $team): array
    {
        $players = $team->players ?? collect();

        $teamIssues = $this->reviewTeam($team, $players);
        $playerIssues = $this->reviewDuplicates($players);

        foreach ($players as $player) {
            $issues = $this->reviewPlayer($player);
            if ($issues) {
                $playerIssues[$player->id] = array_merge($playerIssues[$player->id] ?? [], $issues);
            }
        }

        $summary = $this->summarize($teamIssues, $playerIssues);

        return [
            'team_issues' => $teamIssues,
            'player_issues' => $playerIssues,
            'summary' => $summary,
        ];
    }

    private function reviewTeam(Team $team, Collection $players): array
    {
        $issues = [];

        if ($players->isEmpty()) {
            $issues[] = $this->issue('error', 'no_members', 'Team has no players or staff added.');
        } else {
            $roster = $players->where('role', Player::ROLE_PLAYER);

            if ($roster->isEmpty()) {
                $issues[] = $this->issue('error', 'no_players', 'Team has no registered players (only staff).');
            } elseif ($roster->count() < self::MIN_ROSTER_SIZE) {
                $issues[] = $this->issue('warning', 'low_roster', "Only {$roster->count()} player(s) registered; basketball teams typically need at least ".self::MIN_ROSTER_SIZE.'.');
            }

            if (! $players->contains(fn ($p) => in_array($p->role, [Player::ROLE_COACH, Player::ROLE_ASSISTANT_COACH], true))) {
                $issues[] = $this->issue('warning', 'no_coach', 'No coach assigned to this team.');
            }

            if (! $players->contains(fn ($p) => $p->role === Player::ROLE_MANAGER)) {
                $issues[] = $this->issue('warning', 'no_manager', 'No manager assigned to this team.');
            }
        }

        if (! $team->logo) {
            $issues[] = $this->issue('info', 'no_logo', 'Team has no logo.');
        }

        return $issues;
    }

    /**
     * Cross-player checks: duplicate jersey numbers, and duplicate
     * phone/email shared between different members of the same team.
     */
    private function reviewDuplicates(Collection $players): array
    {
        $playerIssues = [];

        $players->where('role', Player::ROLE_PLAYER)
            ->filter(fn ($p) => ! empty($p->jersey_number))
            ->groupBy('jersey_number')
            ->filter(fn ($group) => $group->count() > 1)
            ->each(function (Collection $group, $number) use (&$playerIssues) {
                foreach ($group as $player) {
                    $playerIssues[$player->id][] = $this->issue('error', 'duplicate_jersey', "Jersey number #{$number} is used by multiple players.");
                }
            });

        foreach (['phone_number' => 'phone number', 'email' => 'email'] as $field => $label) {
            $players->filter(fn ($p) => ! empty($p->$field))
                ->groupBy($field)
                ->filter(fn ($group) => $group->count() > 1)
                ->each(function (Collection $group) use (&$playerIssues, $field, $label) {
                    foreach ($group as $player) {
                        $playerIssues[$player->id][] = $this->issue('warning', "duplicate_{$field}", "This {$label} is shared with another member of this team.");
                    }
                });
        }

        return $playerIssues;
    }

    private function reviewPlayer(Player $player): array
    {
        $issues = [];

        if (! $player->photo) {
            $issues[] = $this->issue('warning', 'missing_photo', 'No photo uploaded.');
        }

        if (! $player->phone_number) {
            $issues[] = $this->issue('warning', 'missing_phone', 'No phone number provided.');
        } elseif (! preg_match(self::PHONE_PATTERN, $player->phone_number)) {
            $issues[] = $this->issue('error', 'invalid_phone', 'Phone number format looks invalid.');
        }

        if ($player->email) {
            if (! filter_var($player->email, FILTER_VALIDATE_EMAIL)) {
                $issues[] = $this->issue('error', 'invalid_email', 'Email address format looks invalid.');
            }
        } elseif ($player->role !== Player::ROLE_PLAYER) {
            $issues[] = $this->issue('warning', 'missing_email', 'No email provided.');
        }

        if (! $player->dob) {
            $issues[] = $this->issue('warning', 'missing_dob', 'Date of birth not set.');
        } else {
            $age = $player->dob->age;
            $minAge = $player->role === Player::ROLE_PLAYER ? 10 : 16;

            if ($age < $minAge || $age > 70) {
                $issues[] = $this->issue('error', 'implausible_age', "Age ({$age}) looks implausible for this role.");
            }
        }

        if ($player->role === Player::ROLE_PLAYER) {
            if (! $player->jersey_number) {
                $issues[] = $this->issue('warning', 'missing_jersey', 'No jersey number set.');
            }

            if (! $player->position) {
                $issues[] = $this->issue('info', 'missing_position', 'No position set.');
            }

            if (! $player->certificate) {
                $issues[] = $this->issue('warning', 'missing_certificate', 'No certificate uploaded.');
            } elseif (! $player->is_certificate_validated) {
                $issues[] = $this->issue('info', 'certificate_unvalidated', 'Certificate uploaded but not yet validated.');
            }
        }

        return $issues;
    }

    /**
     * Flatten review results for one or more teams into flat rows suitable
     * for a CSV export: one row per issue found.
     *
     * @param  Collection<int, Team>  $teams
     */
    public function exportRows(Collection $teams): array
    {
        $rows = [];

        foreach ($teams as $team) {
            $result = $this->review($team);
            $players = ($team->players ?? collect())->keyBy('id');

            foreach ($result['team_issues'] as $issue) {
                $rows[] = [
                    'team' => $team->name,
                    'member' => '(Team)',
                    'role' => '-',
                    'severity' => $issue['severity'],
                    'issue' => $issue['message'],
                ];
            }

            foreach ($result['player_issues'] as $playerId => $issues) {
                $player = $players->get($playerId);

                foreach ($issues as $issue) {
                    $rows[] = [
                        'team' => $team->name,
                        'member' => $player->name ?? "Player #{$playerId}",
                        'role' => $player ? str_replace('_', ' ', ucfirst($player->role)) : '-',
                        'severity' => $issue['severity'],
                        'issue' => $issue['message'],
                    ];
                }
            }
        }

        return $rows;
    }

    private function summarize(array $teamIssues, array $playerIssues): array
    {
        $all = collect($teamIssues)->concat(collect($playerIssues)->flatten(1));

        return [
            'total' => $all->count(),
            'errors' => $all->where('severity', 'error')->count(),
            'warnings' => $all->where('severity', 'warning')->count(),
            'info' => $all->where('severity', 'info')->count(),
        ];
    }

    private function issue(string $severity, string $code, string $message): array
    {
        return compact('severity', 'code', 'message');
    }
}
