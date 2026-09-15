import { Head, Link, router } from '@inertiajs/react';
import { format } from 'date-fns';
import {
    Calendar,
    ChevronLeft,
    Check,
    Copy,
    Download,
    IdCard,
    Mail,
    Pencil,
    Phone,
    Plus,
    ShieldAlert,
    Trash2,
    UserPlus,
    Users,
} from 'lucide-react';
import { useState } from 'react';
import { DeleteConfirmationDialog } from '@/components/delete-confirmation-dialog';
import { IssueList, IssueSummaryBadge } from '@/components/review-issues';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import events from '@/routes/events';
import type { Event } from '@/types/event';
import { playerRoleLabel } from '@/types/player';
import type { Player } from '@/types/player';
import type { ReviewIssue, Team, TeamReview } from '@/types/team';
import { AddExistingPlayerDialog } from './components/add-existing-player-dialog';
import type { BasketballClub } from './components/add-existing-player-dialog';
import { PlayerFormDialog } from './components/player-form-dialog';

const STATUS_BADGE: Record<
    Team['status'],
    { label: string; className: string }
> = {
    verified: {
        label: 'Verified',
        className: 'bg-emerald-500 hover:bg-emerald-600',
    },
    pending: { label: 'Pending', className: '' },
    rejected: { label: 'Rejected', className: '' },
};

function PlayerRosterCard({
    player,
    event,
    team,
    clubs,
    reviewMode,
    issues,
    onDelete,
}: {
    player: Player;
    event: Event;
    team: Team;
    clubs: BasketballClub[];
    reviewMode: boolean;
    issues: ReviewIssue[];
    onDelete: (player: Player) => void;
}) {
    const isPlayerRole = player.role === 'player';
    const hasErrors = issues.some((i) => i.severity === 'error');

    return (
        <div
            className={cn(
                'flex flex-col gap-3 rounded-xl border bg-card p-4 shadow-sm transition-shadow hover:shadow-md',
                reviewMode &&
                    issues.length > 0 &&
                    (hasErrors
                        ? 'border-red-500/40 bg-red-500/5'
                        : 'border-amber-500/40 bg-amber-500/5'),
            )}
        >
            <div className="flex items-start gap-3">
                {player.photo ? (
                    <img
                        src={player.photo}
                        alt={player.name}
                        className="h-16 w-12 shrink-0 rounded-lg object-cover"
                    />
                ) : (
                    <div className="flex h-16 w-12 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-lg font-extrabold text-primary">
                        {isPlayerRole
                            ? (player.jersey_number ?? '-')
                            : player.name.substring(0, 2).toUpperCase()}
                    </div>
                )}

                <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="truncate text-sm font-semibold">
                            {player.name}
                        </span>
                        <Badge
                            variant="outline"
                            className="shrink-0 font-mono text-xs"
                        >
                            {isPlayerRole
                                ? `#${player.jersey_number ?? '-'}`
                                : playerRoleLabel(player.role)}
                        </Badge>
                    </div>
                    {isPlayerRole && player.position && (
                        <span className="text-xs text-muted-foreground">
                            {player.position}
                        </span>
                    )}

                    <div className="mt-1 flex flex-col gap-0.5 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1.5">
                            <Calendar className="h-3 w-3 shrink-0" />
                            {player.dob ? (
                                format(new Date(player.dob), 'PP')
                            ) : (
                                <span className="italic">DOB not set</span>
                            )}
                        </span>
                        <span className="flex items-center gap-1.5">
                            <Phone className="h-3 w-3 shrink-0" />
                            {player.phone_number ?? (
                                <span className="italic">Missing</span>
                            )}
                        </span>
                        <span className="flex items-center gap-1.5 truncate">
                            <Mail className="h-3 w-3 shrink-0" />
                            {player.email ?? (
                                <span className="italic">Missing</span>
                            )}
                        </span>
                        {(player.birthplace || player.identity_card) && (
                            <span className="flex items-center gap-1.5">
                                <IdCard className="h-3 w-3 shrink-0" />
                                {player.birthplace ?? '—'}
                                {player.identity_card && (
                                    <a
                                        href={player.identity_card}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="underline underline-offset-2"
                                    >
                                        ID document
                                    </a>
                                )}
                            </span>
                        )}
                        {/* The category's extra roster questions (school, class, …). */}
                        {player.extra &&
                            Object.entries(player.extra)
                                .filter(([, v]) => v)
                                .map(([k, v]) => (
                                    <span key={k} className="truncate">
                                        <span className="capitalize">
                                            {k.replace(/_/g, ' ')}
                                        </span>
                                        : {v}
                                    </span>
                                ))}
                    </div>
                </div>

                <div className="flex shrink-0 flex-col gap-1">
                    <PlayerFormDialog
                        event={event}
                        team={team}
                        player={player}
                        trigger={
                            <Button variant="ghost" size="icon">
                                <Pencil className="h-4 w-4" />
                            </Button>
                        }
                        clubs={clubs}
                    />
                    <DeleteConfirmationDialog
                        trigger={
                            <Button
                                variant="ghost"
                                size="icon"
                                className="text-destructive"
                            >
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        }
                        confirmationValue={player.name}
                        description={
                            <>
                                This will remove the player{' '}
                                <span className="font-semibold">
                                    {player.name}
                                </span>{' '}
                                from this team.
                            </>
                        }
                        onConfirm={() => onDelete(player)}
                    />
                </div>
            </div>

            {reviewMode && (
                <div className="flex flex-col gap-1.5 border-t pt-3">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-muted-foreground">
                            Review
                        </span>
                        <IssueSummaryBadge
                            summary={{
                                total: issues.length,
                                errors: issues.filter(
                                    (i) => i.severity === 'error',
                                ).length,
                                warnings: issues.filter(
                                    (i) => i.severity === 'warning',
                                ).length,
                                info: issues.filter(
                                    (i) => i.severity === 'info',
                                ).length,
                            }}
                        />
                    </div>
                    <IssueList issues={issues} />
                </div>
            )}
        </div>
    );
}

export default function ShowTeam({
    event,
    team,
    clubs,
    review,
    rosterUrl = null,
}: {
    event: Event;
    team: Team;
    clubs: BasketballClub[];
    review: TeamReview;
    /** The captain's self-service roster page, when the team is in a tournament. */
    rosterUrl?: string | null;
}) {
    const [copied, setCopied] = useState(false);
    const [rosterCopied, setRosterCopied] = useState(false);
    const [reviewMode, setReviewMode] = useState(false);
    const shareUrl = `${window.location.origin}/teams/${team.id}/id-card`;

    const handleCopy = () => {
        navigator.clipboard.writeText(shareUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleCopyRoster = () => {
        if (!rosterUrl) {
            return;
        }

        navigator.clipboard.writeText(rosterUrl);
        setRosterCopied(true);
        setTimeout(() => setRosterCopied(false), 2000);
    };

    const players = team.players ?? [];

    const handleDeletePlayer = (player: Player) => {
        router.delete(
            `/dashboard/events/${event.id}/teams/${team.id}/players/${player.id}`,
        );
    };

    return (
        <div className="mx-auto flex h-full w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-6 md:px-8 md:py-8">
            <Head title={`${team.name} - ${event.name}`} />

            {/* Header */}
            <section className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex min-w-0 items-start gap-3 sm:gap-4">
                    <Button
                        variant="outline"
                        size="icon"
                        className="mt-0.5 h-10 w-10 shrink-0 sm:mt-1"
                        asChild
                    >
                        <Link href={`/dashboard/events/${event.id}/teams`}>
                            <ChevronLeft className="h-5 w-5" />
                        </Link>
                    </Button>
                    <div className="flex min-w-0 flex-col gap-2">
                        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                            {team.logo ? (
                                <img
                                    src={team.logo}
                                    alt={team.name}
                                    className="h-10 w-10 rounded-full object-cover"
                                />
                            ) : (
                                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                                    {team.name.substring(0, 2).toUpperCase()}
                                </div>
                            )}
                            <h1 className="min-w-0 text-xl font-extrabold tracking-tight break-words text-foreground sm:text-2xl lg:text-3xl">
                                {team.name}
                            </h1>
                            {team.basketball_event_category && (
                                <Badge
                                    variant="secondary"
                                    className="rounded-full px-3 py-1"
                                >
                                    {team.basketball_event_category.name}
                                </Badge>
                            )}
                            <Badge
                                variant={
                                    team.status === 'verified'
                                        ? 'default'
                                        : team.status === 'rejected'
                                          ? 'destructive'
                                          : 'secondary'
                                }
                                className={STATUS_BADGE[team.status].className}
                            >
                                {STATUS_BADGE[team.status].label}
                            </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                            {event.name} — {players.length} team member
                            {players.length !== 1 ? 's' : ''}
                        </p>
                    </div>
                </div>
                <div className="flex shrink-0 flex-wrap items-center gap-2 *:flex-1 sm:*:flex-none">
                    <Button
                        variant={reviewMode ? 'default' : 'outline'}
                        onClick={() => setReviewMode((v) => !v)}
                    >
                        <ShieldAlert className="mr-2 h-4 w-4" />
                        Review Mode
                    </Button>
                    {reviewMode && (
                        <Button variant="outline" asChild>
                            <a
                                href={`/dashboard/events/${event.id}/teams/${team.id}/review-export`}
                            >
                                <Download className="mr-2 h-4 w-4" />
                                Export Issues
                            </a>
                        </Button>
                    )}
                    <Button variant="outline" asChild>
                        <Link
                            href={`/dashboard/events/${event.id}/teams/${team.id}/edit`}
                        >
                            <Pencil className="mr-2 h-4 w-4" />
                            Edit Team
                        </Link>
                    </Button>
                </div>
            </section>

            {reviewMode && review.team_issues.length > 0 && (
                <section className="flex flex-col gap-2 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
                    <div className="flex items-center gap-2">
                        <ShieldAlert className="h-4 w-4 text-amber-500" />
                        <h3 className="text-sm font-semibold">
                            Team-level issues
                        </h3>
                    </div>
                    <IssueList issues={review.team_issues} />
                </section>
            )}

            {/* Share link */}
            <section className="flex flex-col gap-3 rounded-xl border bg-card p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-col gap-1">
                    <h3 className="text-sm font-semibold tracking-tight">
                        Team ID Card Link
                    </h3>
                    <p className="text-xs text-muted-foreground">
                        Share this public link with the team manager or players
                        to access their ID card.
                    </p>
                </div>
                {/* The URL gets its own row on a phone — sharing a link you
                    cannot read defeats the point. */}
                <div className="flex w-full flex-col gap-2 sm:w-auto sm:max-w-md sm:flex-row sm:items-center">
                    <input
                        type="text"
                        readOnly
                        value={shareUrl}
                        className="flex h-9 w-full min-w-0 shrink rounded-md border border-input bg-background px-3 py-1 font-mono text-xs shadow-sm transition-colors select-all file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                    />
                    <div className="flex items-center gap-2">
                        <Button
                            variant="secondary"
                            size="sm"
                            onClick={handleCopy}
                            className="flex-1 shrink-0 sm:flex-none"
                        >
                            {copied ? (
                                <>
                                    <Check className="mr-1.5 h-3.5 w-3.5 text-emerald-600" />
                                    Copied!
                                </>
                            ) : (
                                <>
                                    <Copy className="mr-1.5 h-3.5 w-3.5" />
                                    Copy Link
                                </>
                            )}
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            asChild
                            className="flex-1 shrink-0 sm:flex-none"
                        >
                            <a
                                href={shareUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                Open
                            </a>
                        </Button>
                    </div>
                </div>
            </section>

            {rosterUrl && (
                <section className="flex flex-col gap-3 rounded-xl border bg-card p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-6">
                    <div className="min-w-0">
                        <h3 className="text-sm font-semibold">
                            Captain's roster link
                        </h3>
                        <p className="text-xs text-muted-foreground">
                            Lets the team add and edit their own members until
                            you verify them or the roster deadline passes.
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="secondary"
                            size="sm"
                            onClick={handleCopyRoster}
                            className="flex-1 shrink-0 sm:flex-none"
                        >
                            {rosterCopied ? (
                                <>
                                    <Check className="mr-1.5 h-3.5 w-3.5 text-emerald-600" />
                                    Copied!
                                </>
                            ) : (
                                <>
                                    <Copy className="mr-1.5 h-3.5 w-3.5" />
                                    Copy Link
                                </>
                            )}
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            asChild
                            className="flex-1 shrink-0 sm:flex-none"
                        >
                            <a
                                href={rosterUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                Open
                            </a>
                        </Button>
                    </div>
                </section>
            )}

            {/* Roster */}
            <section className="flex min-w-0 flex-col gap-4 rounded-xl border bg-card p-4 shadow-sm sm:p-6">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div className="min-w-0">
                        <h2 className="text-lg font-semibold tracking-tight sm:text-xl">
                            Roster
                        </h2>
                        <p className="text-sm text-muted-foreground">
                            Manage players and staff in {team.name}
                        </p>
                    </div>

                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center lg:shrink-0">
                        <AddExistingPlayerDialog
                            event={event}
                            team={team}
                            clubs={clubs}
                            trigger={
                                <Button
                                    variant="outline"
                                    className="w-full sm:w-auto"
                                >
                                    <Users className="mr-2 h-4 w-4" />
                                    Add Existing Player
                                </Button>
                            }
                        />
                        <PlayerFormDialog
                            event={event}
                            team={team}
                            trigger={
                                <Button className="w-full sm:w-auto">
                                    <Plus className="mr-2 h-4 w-4" />
                                    Add Team Member
                                </Button>
                            }
                            clubs={clubs}
                        />
                    </div>
                </div>

                {players.length === 0 ? (
                    <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed py-12 text-center text-muted-foreground">
                        <UserPlus className="h-6 w-6" />
                        No team members have been added.
                    </div>
                ) : (
                    <div className="grid gap-3 sm:grid-cols-2">
                        {players.map((player) => (
                            <PlayerRosterCard
                                key={player.id}
                                player={player}
                                event={event}
                                team={team}
                                clubs={clubs}
                                reviewMode={reviewMode}
                                issues={review.player_issues[player.id] ?? []}
                                onDelete={handleDeletePlayer}
                            />
                        ))}
                    </div>
                )}
            </section>
        </div>
    );
}

ShowTeam.layout = {
    breadcrumbs: [
        { title: 'Events', href: events.index() },
        { title: 'Teams', href: '#' },
    ],
};
