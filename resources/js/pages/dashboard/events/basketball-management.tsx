import { useState } from 'react';
import { Link, router } from '@inertiajs/react';
import {
    Users,
    LayoutGrid,
    Swords,
    Plus,
    Pencil,
    Trash2,
    X,
    UserPlus,
    Icon,
} from 'lucide-react';
import { basketball } from '@lucide/lab';
import { DeleteConfirmationDialog } from '@/components/delete-confirmation-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { BasketballEventCategory } from '@/types/basketball-event-category';
import type { Event } from '@/types/event';
import type { Pool } from '@/types/pool';
import type { Team } from '@/types/team';
import { BasketballCategoryFormDialog } from './components/basketball-category-form-dialog';
import { PoolFormDialog } from './teams/components/pool-form-dialog';

function EmptyState({
    icon,
    title,
    description,
    action,
}: {
    icon: React.ReactNode;
    title: string;
    description: string;
    action?: React.ReactNode;
}) {
    return (
        <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed py-10 text-center">
            <div className="text-muted-foreground">{icon}</div>
            <p className="text-sm font-medium">{title}</p>
            <p className="max-w-sm text-sm text-muted-foreground">
                {description}
            </p>
            {action}
        </div>
    );
}

function PoolCard({
    event,
    pool,
    availableTeams,
    onDelete,
}: {
    event: Event;
    pool: Pool;
    availableTeams: Team[];
    onDelete: (pool: Pool) => void;
}) {
    const [selectedTeamId, setSelectedTeamId] = useState('');
    const assignedTeams = pool.teams ?? [];

    const handleAssign = () => {
        if (!selectedTeamId) return;

        router.post(
            `/dashboard/events/${event.id}/pools/${pool.id}/teams`,
            { team_id: selectedTeamId },
            {
                preserveScroll: true,
                onSuccess: () => setSelectedTeamId(''),
            },
        );
    };

    const handleRemoveTeam = (team: Team) => {
        router.delete(
            `/dashboard/events/${event.id}/pools/${pool.id}/teams/${team.id}`,
            { preserveScroll: true },
        );
    };

    return (
        <div className="flex flex-col gap-3 rounded-lg border p-4">
            <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                    <LayoutGrid className="h-4 w-4 text-primary" />
                    <span className="font-medium">{pool.name}</span>
                </div>
                <div className="flex items-center gap-1">
                    <Badge variant="secondary">
                        {assignedTeams.length} team
                        {assignedTeams.length === 1 ? '' : 's'}
                    </Badge>
                    <DeleteConfirmationDialog
                        trigger={
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-destructive"
                            >
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        }
                        confirmationValue={pool.name}
                        description={
                            <>
                                This will permanently delete the pool{' '}
                                <span className="font-semibold">
                                    {pool.name}
                                </span>
                                . Teams assigned to it will be unassigned, not
                                deleted.
                            </>
                        }
                        onConfirm={() => onDelete(pool)}
                    />
                </div>
            </div>

            {assignedTeams.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                    No teams assigned yet.
                </p>
            ) : (
                <div className="flex flex-wrap gap-1.5">
                    {assignedTeams.map((team) => (
                        <span
                            key={team.id}
                            className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs font-medium"
                        >
                            {team.name}
                            <button
                                type="button"
                                onClick={() => handleRemoveTeam(team)}
                                className="text-muted-foreground transition hover:text-destructive"
                                aria-label={`Remove ${team.name} from ${pool.name}`}
                            >
                                <X className="h-3 w-3" />
                            </button>
                        </span>
                    ))}
                </div>
            )}

            {availableTeams.length > 0 && (
                <div className="mt-1 flex items-center gap-2 border-t pt-3">
                    <select
                        value={selectedTeamId}
                        onChange={(e) => setSelectedTeamId(e.target.value)}
                        className="h-8 flex-1 rounded-md border bg-background px-2 text-sm"
                    >
                        <option value="">Assign a team&hellip;</option>
                        {availableTeams.map((team) => (
                            <option key={team.id} value={team.id}>
                                {team.name}
                            </option>
                        ))}
                    </select>
                    <Button
                        size="sm"
                        variant="outline"
                        disabled={!selectedTeamId}
                        onClick={handleAssign}
                    >
                        <UserPlus className="mr-1.5 h-3.5 w-3.5" />
                        Assign
                    </Button>
                </div>
            )}
        </div>
    );
}

export function BasketballManagement({
    event,
    categories = [],
    pools = [],
    teams = [],
}: {
    event: Event;
    categories?: BasketballEventCategory[];
    pools?: Pool[];
    teams?: Team[];
}) {
    const handleDeleteCategory = (category: BasketballEventCategory) => {
        router.delete(
            `/dashboard/events/${event.id}/basketball-categories/${category.id}`,
            { preserveScroll: true },
        );
    };

    const handleDeletePool = (pool: Pool) => {
        router.delete(`/dashboard/events/${event.id}/pools/${pool.id}`, {
            preserveScroll: true,
        });
    };

    const handleRemoveAllPools = () => {
        router.delete(`/dashboard/events/${event.id}/pools`, {
            preserveScroll: true,
        });
    };

    return (
        <section className="flex flex-col gap-6 rounded-xl border bg-card p-6 shadow-sm md:p-8">
            {event.specific_type === 'BasketballEvent' ? (
                <>
                    <h2 className="border-b pb-4 text-xl font-semibold tracking-tight">
                        Basketball Tournament Management
                    </h2>

                    {/* Pools — full detail, shown above Teams & Matches */}
                    <div className="flex flex-col gap-4">
                        <div className="flex items-center justify-between gap-2">
                            <div>
                                <h3 className="font-medium">Pools</h3>
                                <p className="text-sm text-muted-foreground">
                                    Group teams together for round-robin or
                                    bracket play
                                </p>
                            </div>
                            <div className="flex items-center gap-2">
                                {pools.length > 0 && (
                                    <DeleteConfirmationDialog
                                        trigger={
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                className="text-destructive hover:text-destructive"
                                            >
                                                <Trash2 className="mr-2 h-4 w-4" />
                                                Remove All
                                            </Button>
                                        }
                                        confirmationValue="remove all pools"
                                        description={
                                            <>
                                                This will permanently delete{' '}
                                                <span className="font-semibold">
                                                    all {pools.length} pool
                                                    {pools.length === 1
                                                        ? ''
                                                        : 's'}
                                                </span>{' '}
                                                for this event. Teams will be
                                                unassigned, not deleted. Type{' '}
                                                <span className="font-semibold">
                                                    remove all pools
                                                </span>{' '}
                                                below to confirm.
                                            </>
                                        }
                                        onConfirm={handleRemoveAllPools}
                                    />
                                )}
                                <PoolFormDialog
                                    event={event}
                                    trigger={
                                        <Button size="sm">
                                            <Plus className="mr-2 h-4 w-4" />
                                            Add Pool
                                        </Button>
                                    }
                                />
                            </div>
                        </div>

                        {pools.length === 0 ? (
                            <EmptyState
                                icon={<LayoutGrid className="h-5 w-5" />}
                                title="No pools yet"
                                description="Create a pool and assign teams to start organizing your tournament bracket."
                                action={
                                    <PoolFormDialog
                                        event={event}
                                        trigger={
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                className="mt-1"
                                            >
                                                <Plus className="mr-2 h-4 w-4" />
                                                Create your first pool
                                            </Button>
                                        }
                                    />
                                }
                            />
                        ) : (
                            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                                {pools.map((pool) => {
                                    const assignedIds = new Set(
                                        (pool.teams ?? []).map((t) => t.id),
                                    );
                                    const availableTeams = teams.filter(
                                        (t) => !assignedIds.has(t.id),
                                    );

                                    return (
                                        <PoolCard
                                            key={pool.id}
                                            event={event}
                                            pool={pool}
                                            availableTeams={availableTeams}
                                            onDelete={handleDeletePool}
                                        />
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Teams & Matches */}
                    <div className="grid grid-cols-1 gap-4 border-t pt-6 sm:grid-cols-2">
                        <Link
                            href={`/dashboard/events/${event.id}/teams`}
                            className="flex flex-col gap-2 rounded-lg border p-4 transition hover:border-primary/50 hover:bg-muted"
                        >
                            <Users className="h-5 w-5 text-primary" />
                            <span className="font-medium">Teams</span>
                            <span className="text-sm text-muted-foreground">
                                {event.teams_count ?? 0} registered teams
                            </span>
                        </Link>

                        <Link
                            href={`/dashboard/events/${event.id}/matches`}
                            className="flex flex-col gap-2 rounded-lg border p-4 transition hover:border-primary/50 hover:bg-muted"
                        >
                            <Swords className="h-5 w-5 text-primary" />
                            <span className="font-medium">Matches</span>
                            <span className="text-sm text-muted-foreground">
                                {event.matches_count ?? 0} scheduled matches
                            </span>
                        </Link>
                    </div>

                    {/* Match Categories */}
                    <div className="flex flex-col gap-4 border-t pt-6">
                        <div className="flex items-center justify-between gap-2">
                            <div>
                                <h3 className="font-medium">
                                    Match Categories
                                </h3>
                                <p className="text-sm text-muted-foreground">
                                    Manage categories such as age groups or
                                    divisions
                                </p>
                            </div>
                            <BasketballCategoryFormDialog
                                event={event}
                                trigger={
                                    <Button size="sm">
                                        <Plus className="mr-2 h-4 w-4" />
                                        Add Category
                                    </Button>
                                }
                            />
                        </div>

                        {categories.length === 0 ? (
                            <EmptyState
                                icon={
                                    <Icon
                                        iconNode={basketball}
                                        className="h-5 w-5"
                                    />
                                }
                                title="No categories yet"
                                description="Add categories to separate matches by age group, division, or skill level."
                            />
                        ) : (
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                {categories.map((category) => (
                                    <div
                                        key={category.id}
                                        className="flex flex-col gap-2 rounded-lg border p-4"
                                    >
                                        <div className="flex items-start justify-between gap-2">
                                            <span className="font-medium">
                                                {category.name}
                                            </span>
                                            <Badge variant="secondary">
                                                {category.status}
                                            </Badge>
                                        </div>
                                        <p className="text-sm text-muted-foreground">
                                            {category.min_team}
                                            {category.max_team
                                                ? `–${category.max_team}`
                                                : '+'}{' '}
                                            teams &middot;{' '}
                                            {category.min_player_per_team}
                                            {category.max_player_per_team
                                                ? `–${category.max_player_per_team}`
                                                : '+'}{' '}
                                            players/team
                                        </p>
                                        {category.price && (
                                            <p className="text-sm text-muted-foreground">
                                                Rp
                                                {Number(
                                                    category.price,
                                                ).toLocaleString('id-ID')}
                                            </p>
                                        )}
                                        <div className="mt-1 flex justify-end gap-1">
                                            <BasketballCategoryFormDialog
                                                event={event}
                                                category={category}
                                                trigger={
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8"
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
                                                        className="h-8 w-8 text-destructive"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                }
                                                confirmationValue={
                                                    category.name
                                                }
                                                description={
                                                    <>
                                                        This will permanently
                                                        delete the{' '}
                                                        <span className="font-semibold">
                                                            {category.name}
                                                        </span>{' '}
                                                        category.
                                                    </>
                                                }
                                                onConfirm={() =>
                                                    handleDeleteCategory(
                                                        category,
                                                    )
                                                }
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </>
            ) : (
                <div className="flex flex-col items-center justify-center gap-4 py-8 text-center">
                    <div className="space-y-2">
                        <h3 className="text-lg font-medium">
                            Basketball Tournament
                        </h3>
                        <p className="text-sm text-muted-foreground">
                            This event has not been configured as a basketball
                            tournament.
                        </p>
                    </div>
                    <Button
                        onClick={() =>
                            router.post(`/events/${event.id}/basketball`)
                        }
                    >
                        Create Basketball Tournament
                    </Button>
                </div>
            )}
        </section>
    );
}