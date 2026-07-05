import { Head, Link, router } from '@inertiajs/react';
import { ChevronLeft, Pencil, Plus, Trash2, UserPlus } from 'lucide-react';
import { DeleteConfirmationDialog } from '@/components/delete-confirmation-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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

export default function ShowTeam({
    event,
    team,
}: {
    event: Event;
    team: Team;
}) {
    const players = team.players ?? [];

    const handleDeletePlayer = (player: Player) => {
        router.delete(
            `/dashboard/events/${event.id}/teams/${team.id}/players/${player.id}`,
        );
    };

    return (
        <div className="mx-auto flex h-full w-full max-w-4xl flex-1 flex-col gap-8 px-4 py-6 md:px-8 md:py-8">
            <Head title={`${team.name} - ${event.name}`} />

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
                            Manager: {team.manager_name} &middot;{' '}
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
                    <PlayerFormDialog
                        event={event}
                        team={team}
                        trigger={
                            <Button>
                                <Plus className="mr-2 h-4 w-4" />
                                Add New Player
                            </Button>
                        }
                    />
                </div>

                <div className="rounded-md border">
                    <Table>
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
                                            No players has been added.
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                players.map((player) => (
                                    <TableRow key={player.id}>
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
                                                            Ini akan menghapus
                                                            pemain{' '}
                                                            <span className="font-semibold">
                                                                {player.name}
                                                            </span>{' '}
                                                            secara permanen.
                                                        </>
                                                    }
                                                    onConfirm={() =>
                                                        handleDeletePlayer(
                                                            player,
                                                        )
                                                    }
                                                />
                                            </div>
                                        </TableCell>
                                    </TableRow>
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