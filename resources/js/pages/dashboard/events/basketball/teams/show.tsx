import { Head, Link, router } from '@inertiajs/react';
import { format } from 'date-fns';
import { ChevronLeft, Mail, Pencil, Phone, Plus, Trash2, UserPlus, Users, Copy, Check } from 'lucide-react';
import { useState } from 'react';
import { DeleteConfirmationDialog } from '@/components/delete-confirmation-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    HoverCard,
    HoverCardContent,
    HoverCardTrigger,
} from '@/components/ui/hover-card';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import events from '@/routes/events';
import type { Event } from '@/types/event';
import type { Player } from '@/types/player';
import type { Team } from '@/types/team';
import { AddExistingPlayerDialog  } from './components/add-existing-player-dialog';
import type {BasketballClub} from './components/add-existing-player-dialog';
import { PlayerFormDialog } from './components/player-form-dialog';

const STATUS_BADGE: Record<Team['status'], { label: string; className: string }> = {
    verified: {
        label: 'Verified',
        className: 'bg-emerald-500 hover:bg-emerald-600',
    },
    pending: { label: 'Pending', className: '' },
    rejected: { label: 'Rejected', className: '' },
};

function PlayerHoverContent({ player }: { player: Player }) {
    // ... [Content stays exactly the same as your code] ...
    return (
        <div className="flex gap-3">
            {player.photo ? (
                <img
                    src={player.photo}
                    alt={player.name}
                    className="h-20 w-16 shrink-0 rounded-md object-cover"
                />
            ) : (
                <div className="flex h-20 w-16 shrink-0 items-center justify-center rounded-md bg-primary/10 text-lg font-bold text-primary">
                    {player.name.substring(0, 2).toUpperCase()}
                </div>
            )}
            <div className="flex flex-col gap-1">
                <p className="font-semibold leading-none">{player.name}</p>
                <p className="text-xs text-muted-foreground">
                    #{player.jersey_number}
                    {player.position ? ` · ${player.position}` : ''}
                </p>

                <div className="mt-2 flex flex-col gap-1 text-xs text-muted-foreground">
                    <span>
                        {player.dob
                            ? format(new Date(player.dob), 'PPP')
                            : 'DOB not set'}
                    </span>
                    <span className="flex items-center gap-1.5">
                        <Phone className="h-3 w-3" />
                        {player.phone_number ?? '-'}
                    </span>
                    <span className="flex items-center gap-1.5">
                        <Mail className="h-3 w-3" />
                        {player.email ?? '-'}
                    </span>
                </div>
            </div>
        </div>
    );
}

export default function ShowTeam({
    event,
    team,
    clubs, // <-- Add this
}: {
    event: Event;
    team: Team;
    clubs: BasketballClub[]; // <-- Add this
}) {
    const [copied, setCopied] = useState(false);
    const shareUrl = `${window.location.origin}/teams/${team.id}/id-card`;

    const handleCopy = () => {
        navigator.clipboard.writeText(shareUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const players = team.players ?? [];

    const handleDeletePlayer = (player: Player) => {
        router.delete(
            `/dashboard/events/${event.id}/teams/${team.id}/players/${player.id}`,
        );
    };

    return (
        <div className="mx-auto flex h-full w-full max-w-4xl flex-1 flex-col gap-8 px-4 py-6 md:px-8 md:py-8">
            <Head title={`${team.name} - ${event.name}`} />

            {/* Header section remains identical... */}
            <section className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex items-start gap-4">
                    <Button
                        variant="outline"
                        size="icon"
                        className="mt-1 h-10 w-10 shrink-0"
                        asChild
                    >
                        <Link href={`/dashboard/events/${event.id}/teams`}>
                            <ChevronLeft className="h-5 w-5" />
                        </Link>
                    </Button>
                    <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-3">
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
                            <h1 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
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
                            Manager: {team.manager_name} ·{' '}
                            {team.manager_phone}
                        </p>
                    </div>
                </div>
                <Button variant="outline" asChild>
                    <Link
                        href={`/dashboard/events/${event.id}/teams/${team.id}/edit`}
                    >
                        <Pencil className="mr-2 h-4 w-4" />
                        Edit Team
                    </Link>
                </Button>
            </section>

            <section className="flex flex-col gap-3 rounded-xl border bg-muted/40 p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-col gap-1">
                    <h3 className="text-sm font-semibold tracking-tight">Team ID Card Link</h3>
                    <p className="text-xs text-muted-foreground">Share this public link with the team manager or players to access their ID card.</p>
                </div>
                <div className="flex items-center gap-2 max-w-md w-full sm:w-auto">
                    <input
                        type="text"
                        readOnly
                        value={shareUrl}
                        className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 font-mono text-xs select-all shrink"
                    />
                    <Button
                        variant="secondary"
                        size="sm"
                        onClick={handleCopy}
                        className="shrink-0"
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
                        className="shrink-0"
                    >
                        <a href={shareUrl} target="_blank" rel="noopener noreferrer">
                            Open
                        </a>
                    </Button>
                </div>
            </section>

            <section className="flex flex-col gap-4 rounded-xl border bg-card p-6 shadow-sm">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-semibold tracking-tight">
                            Player List
                        </h2>
                        <p className="text-sm text-muted-foreground">
                            Manage players in {team.name}
                        </p>
                    </div>

                    {/* Replaced single button with a flex group for both buttons */}
                    <div className="flex items-center gap-2">
                        <AddExistingPlayerDialog
                            event={event}
                            team={team}
                            clubs={clubs}
                            trigger={
                                <Button variant="outline">
                                    <Users className="mr-2 h-4 w-4" />
                                    Add Existing Player
                                </Button>
                            }
                        />
                        <PlayerFormDialog
                            event={event}
                            team={team}
                            trigger={
                                <Button>
                                    <Plus className="mr-2 h-4 w-4" />
                                    Add New Player
                                </Button>
                            }
                            clubs={clubs}
                        />
                    </div>
                </div>

                <div className="rounded-md border">
                    <Table>
                        {/* Table implementation remains identical... */}
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-16">No.</TableHead>
                                <TableHead>Name</TableHead>
                                <TableHead>Position</TableHead>
                                <TableHead className="text-right">
                                    Actions
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {players.length === 0 ? (
                                <TableRow>
                                    <TableCell
                                        colSpan={4}
                                        className="h-24 text-center"
                                    >
                                        <div className="flex flex-col items-center gap-2 text-muted-foreground">
                                            <UserPlus className="h-6 w-6" />
                                            No players have been added.
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                players.map((player) => (
                                    <HoverCard
                                        key={player.id}
                                        openDelay={150}
                                        closeDelay={100}
                                    >
                                        <HoverCardTrigger asChild>
                                            <TableRow className="cursor-default">
                                                <TableCell className="font-bold italic text-xl">
                                                    {player.jersey_number}
                                                </TableCell>
                                                <TableCell className="font-medium">
                                                    {player.name}
                                                </TableCell>
                                                <TableCell>
                                                    {player.position ?? (
                                                        <span className="text-muted-foreground">
                                                            -
                                                        </span>
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <div className="flex justify-end gap-2">
                                                        <PlayerFormDialog
                                                            event={event}
                                                            team={team}
                                                            player={player}
                                                            trigger={
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                >
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
                                                            confirmationValue={
                                                                player.name
                                                            }
                                                            description={
                                                                <>
                                                                    This will remove the player{' '}
                                                                    <span className="font-semibold">
                                                                        {player.name}
                                                                    </span>{' '}
                                                                    from this team.
                                                                </>
                                                            }
                                                            onConfirm={() =>
                                                                handleDeletePlayer(player)
                                                            }
                                                        />
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        </HoverCardTrigger>
                                        <HoverCardContent
                                            className="w-72"
                                            align="start"
                                        >
                                            <PlayerHoverContent
                                                player={player}
                                            />
                                        </HoverCardContent>
                                    </HoverCard>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
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