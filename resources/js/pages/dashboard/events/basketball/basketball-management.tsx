import { Link, router } from '@inertiajs/react';
import { basketball } from '@lucide/lab';
import {
    Users,
    LayoutGrid,
    Swords,
    Plus,
    Pencil,
    Trash2,
    X,
    UserPlus,
    Loader2,
    Icon,
} from 'lucide-react';
import { useState } from 'react';
import { DeleteConfirmationDialog } from '@/components/delete-confirmation-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { formatRupiah } from '@/lib/format-currency';
import type { BasketballEventCategory } from '@/types/basketball-event-category';
import type { Event } from '@/types/event';
import type { Pool } from '@/types/pool';
import type { Team } from '@/types/team';
import { BasketballCategoryFormDialog } from './components/basketball-category-form-dialog';
import { PoolFormDialog } from './teams/components/pool-form-dialog';

// NOTE: Pools are scoped per category (Pool.basketball_event_category_id),
// and PoolFormDialog only shows teams "already scoped to this category".
// That means Team needs a category link too. If `Team` doesn't yet carry
// `basketball_event_category_id`, add it to `types/team.ts` — everything
// below assumes it exists. Until then this field is optional-chained so
// the file still compiles, but category-scoped filtering won't do
// anything useful until the type (and the backend relation) is real.
type CategoryScopedTeam = Team & {
    basketball_event_category_id?: number | null;
};

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
    const [isAssigning, setIsAssigning] = useState(false);
    const [removingTeamId, setRemovingTeamId] = useState<number | null>(null);
    const assignedTeams = pool.teams ?? [];

    const handleAssign = () => {
        if (!selectedTeamId) {
            return;
        }

        router.post(
            `/dashboard/events/${event.id}/basketball-categories/${pool.basketball_event_category_id}/pools/${pool.id}/teams`,
            { team_id: selectedTeamId },
            {
                preserveScroll: true,
                onStart: () => setIsAssigning(true),
                onSuccess: () => setSelectedTeamId(''),
                onFinish: () => setIsAssigning(false),
            },
        );
    };

    const handleRemoveTeam = (team: Team) => {
        router.delete(
            `/dashboard/events/${event.id}/basketball-categories/${pool.basketball_event_category_id}/pools/${pool.id}/teams/${team.id}`,
            {
                preserveScroll: true,
                onStart: () => setRemovingTeamId(team.id),
                onFinish: () => setRemovingTeamId(null),
            },
        );
    };

    return (
        <div className="flex min-w-0 flex-col gap-3 rounded-lg border p-3 sm:p-4">
            <div className="flex items-start justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2">
                    <LayoutGrid className="h-4 w-4 shrink-0 text-primary" />
                    <span className="min-w-0 truncate font-medium">
                        {pool.name}
                    </span>
                </div>
                <div className="flex shrink-0 items-center gap-1">
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
                                disabled={removingTeamId === team.id}
                                className="text-muted-foreground transition hover:text-destructive disabled:opacity-50"
                                aria-label={`Remove ${team.name} from ${pool.name}`}
                            >
                                {removingTeamId === team.id ? (
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                    <X className="h-3 w-3" />
                                )}
                            </button>
                        </span>
                    ))}
                </div>
            )}

            {availableTeams.length > 0 && (
                <div className="mt-1 flex items-center gap-2 border-t pt-3">
                    <Select
                        value={selectedTeamId}
                        onValueChange={setSelectedTeamId}
                    >
                        <SelectTrigger className="h-8 min-w-0 flex-1 text-sm">
                            <SelectValue placeholder="Assign a team…" />
                        </SelectTrigger>
                        <SelectContent>
                            {availableTeams.map((team) => (
                                <SelectItem
                                    key={team.id}
                                    value={String(team.id)}
                                >
                                    {team.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Button
                        size="sm"
                        variant="outline"
                        disabled={!selectedTeamId || isAssigning}
                        onClick={handleAssign}
                    >
                        {isAssigning ? (
                            <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                        ) : (
                            <UserPlus className="mr-1.5 h-3.5 w-3.5" />
                        )}
                        Assign
                    </Button>
                </div>
            )}
        </div>
    );
}

function CategoryPools({
    event,
    category,
    pools,
    teams,
    onDeletePool,
    onRemoveCategoryPools,
}: {
    event: Event;
    category: BasketballEventCategory;
    pools: Pool[];
    teams: CategoryScopedTeam[];
    onDeletePool: (pool: Pool) => void;
    onRemoveCategoryPools: (category: BasketballEventCategory) => void;
}) {
    // Round robin categories play every team against every other team
    // directly — pools don't apply, so skip straight to a note instead
    // of an empty grid with a dangling "Add Pool" button.
    if (category.format === 'round_robin') {
        return (
            <p className="mt-2 border-t pt-3 text-xs text-muted-foreground">
                This category uses round robin — pools aren't used. Head to
                Matches to generate the schedule.
            </p>
        );
    }

    const categoryTeams = teams.filter(
        (t) => t.basketball_event_category_id === category.id,
    );

    return (
        <div className="mt-2 flex flex-col gap-3 border-t pt-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-medium text-muted-foreground">
                    {pools.length} pool{pools.length === 1 ? '' : 's'}
                </span>
                <div className="ml-auto flex items-center gap-1.5">
                    {pools.length > 0 && (
                        <DeleteConfirmationDialog
                            trigger={
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-7 text-destructive hover:text-destructive"
                                >
                                    <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                                    Remove all
                                </Button>
                            }
                            confirmationValue="remove all pools"
                            description={
                                <>
                                    This will permanently delete{' '}
                                    <span className="font-semibold">
                                        all {pools.length} pool
                                        {pools.length === 1 ? '' : 's'}
                                    </span>{' '}
                                    in {category.name}. Teams will be
                                    unassigned, not deleted. Type{' '}
                                    <span className="font-semibold">
                                        remove all pools
                                    </span>{' '}
                                    below to confirm.
                                </>
                            }
                            onConfirm={() => onRemoveCategoryPools(category)}
                        />
                    )}
                    <PoolFormDialog
                        event={event}
                        category={category}
                        teams={categoryTeams}
                        existingPoolCount={pools.length}
                        trigger={
                            <Button size="sm" variant="outline" className="h-7">
                                <Plus className="mr-1.5 h-3.5 w-3.5" />
                                Manage pools
                            </Button>
                        }
                    />
                </div>
            </div>

            {pools.length === 0 ? (
                <p className="text-xs text-muted-foreground sm:text-sm">
                    No pools yet — create one to start grouping teams for
                    bracket play.
                </p>
            ) : (
                <div className="grid grid-cols-1 gap-3">
                    {pools.map((pool) => {
                        const assignedIds = new Set(
                            (pool.teams ?? []).map((t) => t.id),
                        );
                        const availableTeams = categoryTeams.filter(
                            (t) => !assignedIds.has(t.id),
                        );

                        return (
                            <PoolCard
                                key={pool.id}
                                event={event}
                                pool={pool}
                                availableTeams={availableTeams}
                                onDelete={onDeletePool}
                            />
                        );
                    })}
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
    teams?: CategoryScopedTeam[];
}) {
    const handleDeleteCategory = (category: BasketballEventCategory) => {
        router.delete(
            `/dashboard/events/${event.id}/basketball-categories/${category.id}`,
            { preserveScroll: true },
        );
    };

    const handleDeletePool = (pool: Pool) => {
        router.delete(
            `/dashboard/events/${event.id}/basketball-categories/${pool.basketball_event_category_id}/pools/${pool.id}`,
            {
                preserveScroll: true,
            },
        );
    };

    const handleRemoveCategoryPools = (category: BasketballEventCategory) => {
        router.delete(
            `/dashboard/events/${event.id}/basketball-categories/${category.id}/pools`,
            { preserveScroll: true },
        );
    };

    return (
        <section className="flex flex-col gap-5 rounded-xl border bg-card p-4 shadow-sm sm:gap-6 sm:p-6 md:p-8">
            {event.specific_type === 'BasketballEvent' ? (
                <>
                    <h2 className="border-b pb-4 text-lg font-semibold tracking-tight sm:text-xl">
                        Basketball Tournament Management
                    </h2>

                    {/* Teams & Matches — event-level overview links. Reads as a
                        single row on a phone; the stacked card only earns its
                        height once there is room for it. */}
                    <Link
                        href={`/dashboard/events/${event.id}/teams`}
                        className="flex items-center gap-3 rounded-lg border p-3 transition hover:border-primary/50 hover:bg-muted sm:flex-col sm:items-start sm:gap-2 sm:p-4"
                    >
                        <Users className="h-5 w-5 shrink-0 text-primary" />
                        <span className="font-medium">Teams</span>
                        <span className="ml-auto text-sm text-muted-foreground sm:ml-0">
                            {event.teams_count ?? 0}
                            <span className="hidden sm:inline">
                                {' '}
                                registered teams
                            </span>
                            <span className="sr-only sm:hidden">
                                {' '}
                                registered teams
                            </span>
                        </span>
                    </Link>

                    {/* Match Categories — the flow starts here: a category
                        defines format + team limits, teams register into
                        it, and (for pool_stage categories) pools are
                        managed inline right below it. */}
                    <div className="flex flex-col gap-4 border-t pt-5 sm:pt-6">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-2">
                            <div className="min-w-0">
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
                                    <Button
                                        size="sm"
                                        className="w-full shrink-0 sm:w-auto"
                                    >
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
                                description="Add a category to set its format and limits — teams, pools, and matches all build on top of it."
                            />
                        ) : (
                            <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                                {categories.map((category) => {
                                    const categoryPools = pools.filter(
                                        (p) =>
                                            p.basketball_event_category_id ===
                                            category.id,
                                    );
                                    const categoryTeamCount = teams.filter(
                                        (t) =>
                                            t.basketball_event_category_id ===
                                            category.id,
                                    ).length;

                                    return (
                                        <div
                                            key={category.id}
                                            className="flex min-w-0 flex-col gap-2 rounded-lg border p-3 sm:p-4"
                                        >
                                            <div className="flex items-start justify-between gap-2">
                                                <span className="min-w-0 font-medium break-words">
                                                    {category.name}
                                                </span>
                                                <div className="flex items-center gap-2">
                                                    <Badge variant="outline">
                                                        {category.format ===
                                                        'round_robin'
                                                            ? 'Round Robin'
                                                            : 'Pool Stage'}
                                                    </Badge>

                                                    {category.registration_category && (
                                                        <Badge
                                                            variant={
                                                                category
                                                                    .registration_category
                                                                    .registration_open
                                                                    ? 'secondary'
                                                                    : 'outline'
                                                            }
                                                        >
                                                            {category
                                                                .registration_category
                                                                .registration_open
                                                                ? 'Open'
                                                                : 'Closed'}
                                                        </Badge>
                                                    )}
                                                </div>
                                            </div>
                                            <p className="text-sm text-muted-foreground">
                                                {categoryTeamCount} of{' '}
                                                {category.min_team}
                                                {category.registration_category
                                                    ?.quota
                                                    ? `–${category.registration_category.quota}`
                                                    : '+'}{' '}
                                                teams &middot;{' '}
                                                {category.min_player_per_team}
                                                {category.max_player_per_team
                                                    ? `–${category.max_player_per_team}`
                                                    : '+'}{' '}
                                                players/team
                                            </p>
                                            {category.registration_category && (
                                                <p className="text-sm text-muted-foreground">
                                                    {formatRupiah(
                                                        category
                                                            .registration_category
                                                            .price,
                                                    )}{' '}
                                                    &middot;{' '}
                                                    <Link
                                                        href={`/dashboard/events/${event.id}/registration-categories`}
                                                        className="underline underline-offset-2 hover:text-foreground"
                                                    >
                                                        Pricing &amp; form
                                                    </Link>
                                                </p>
                                            )}
                                            <div className="mt-1 flex flex-wrap items-center justify-between gap-1">
                                                <div className="flex items-center gap-1">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-7 px-2 text-xs"
                                                        asChild
                                                    >
                                                        <Link
                                                            href={`/dashboard/events/${event.id}/basketball-categories/${category.id}/matches`}
                                                        >
                                                            <Swords className="mr-1 h-3.5 w-3.5" />
                                                            Matches
                                                        </Link>
                                                    </Button>
                                                    {category.format !==
                                                        'round_robin' && (
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="h-7 px-2 text-xs"
                                                            asChild
                                                        >
                                                            <Link
                                                                href={`/dashboard/events/${event.id}/basketball-categories/${category.id}/bracket`}
                                                            >
                                                                <LayoutGrid className="mr-1 h-3.5 w-3.5" />
                                                                Bracket
                                                            </Link>
                                                        </Button>
                                                    )}
                                                </div>
                                                <div className="ml-auto flex items-center gap-1">
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
                                                                This will
                                                                permanently
                                                                delete the{' '}
                                                                <span className="font-semibold">
                                                                    {
                                                                        category.name
                                                                    }
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

                                            <CategoryPools
                                                event={event}
                                                category={category}
                                                pools={categoryPools}
                                                teams={teams}
                                                onDeletePool={handleDeletePool}
                                                onRemoveCategoryPools={
                                                    handleRemoveCategoryPools
                                                }
                                            />
                                        </div>
                                    );
                                })}
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
