// resources/js/pages/dashboard/events/teams/index.tsx
import { Head, Link, router } from '@inertiajs/react';
import { ChevronLeft, Plus, Pencil, Trash2, Search, Users } from 'lucide-react';
import { useState, useEffect } from 'react';
import { DeleteConfirmationDialog } from '@/components/delete-confirmation-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import type { BasketballEventCategory } from '@/types/basketball-event-category';
import type { Event } from '@/types/event';
import type { PaginatedTeams, Team, TeamStatus } from '@/types/team';
import { TEAM_STATUSES } from '@/types/team';

interface Props {
    event: Event;
    teams: PaginatedTeams;
    categories: BasketballEventCategory[];
    filters: {
        search?: string;
        category?: string;
        status?: string;
    };
}

const STATUS_VARIANT: Record<TeamStatus, 'default' | 'secondary' | 'destructive'> = {
    verified: 'default',
    pending: 'secondary',
    rejected: 'destructive',
};

function EmptyState() {
    return (
        <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed py-14 text-center">
            <Users className="h-6 w-6 text-muted-foreground" />
            <p className="text-sm font-medium">No teams found</p>
            <p className="max-w-sm text-sm text-muted-foreground">
                Try adjusting your filters, or register a new team to get
                started.
            </p>
        </div>
    );
}

export default function TeamsIndex({ event, teams, categories, filters }: Props) {
    const [search, setSearch] = useState(filters.search ?? '');

    // Debounce search so we're not firing a request on every keystroke
    useEffect(() => {
        const timeout = setTimeout(() => {
            if (search === (filters.search ?? '')) return;
            applyFilters({ search: search || undefined });
        }, 400);

        return () => clearTimeout(timeout);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [search]);

    function applyFilters(next: Partial<Props['filters']>) {
        router.get(
            `/dashboard/events/${event.id}/teams`,
            { ...filters, ...next },
            { preserveScroll: true, preserveState: true, replace: true },
        );
    }

    function handleDelete(team: Team) {
        router.delete(`/dashboard/events/${event.id}/teams/${team.id}`, {
            preserveScroll: true,
        });
    }

    const hasActiveFilters = Boolean(
        filters.search || filters.category || filters.status,
    );

    return (
        <div className="mx-auto flex h-full w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-6 md:px-8 md:py-8">
            <Head title={`Teams · ${event.name}`} />

            {/* Header */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-4">
                    <Button variant="outline" size="icon" className="h-10 w-10 shrink-0" asChild>
                        <Link href={`/dashboard/events/${event.id}`}>
                            <ChevronLeft className="h-5 w-5" />
                        </Link>
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Teams</h1>
                        <p className="text-sm text-muted-foreground">{event.name}</p>
                    </div>
                </div>

                <Button asChild>
                    <Link href={`/dashboard/events/${event.id}/teams/create`}>
                        <Plus className="mr-2 h-4 w-4" />
                        Add Team
                    </Link>
                </Button>
            </div>

            {/* Filters */}
            <div className="flex flex-col gap-3 rounded-xl border bg-card p-4 sm:flex-row sm:items-center">
                <div className="relative flex-1">
                    <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search teams..."
                        className="pl-9"
                    />
                </div>

                <Select
                    value={filters.category ?? 'all'}
                    onValueChange={(v) =>
                        applyFilters({ category: v === 'all' ? undefined : v })
                    }
                >
                    <SelectTrigger className="w-full sm:w-48">
                        <SelectValue placeholder="All categories" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All categories</SelectItem>
                        {categories.map((category) => (
                            <SelectItem key={category.id} value={String(category.id)}>
                                {category.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                <Select
                    value={filters.status ?? 'all'}
                    onValueChange={(v) =>
                        applyFilters({ status: v === 'all' ? undefined : v })
                    }
                >
                    <SelectTrigger className="w-full sm:w-40">
                        <SelectValue placeholder="All statuses" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All statuses</SelectItem>
                        {TEAM_STATUSES.map((status) => (
                            <SelectItem key={status.value} value={status.value}>
                                {status.label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                {hasActiveFilters && (
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                            setSearch('');
                            router.get(`/dashboard/events/${event.id}/teams`, {}, {
                                preserveScroll: true,
                            });
                        }}
                    >
                        Clear
                    </Button>
                )}
            </div>

            {/* Team list */}
            {teams.data.length === 0 ? (
                <EmptyState />
            ) : (
                <div className="overflow-hidden rounded-xl border bg-card">
                    <table className="w-full text-sm">
                        <thead className="border-b bg-muted/40 text-left text-muted-foreground">
                            <tr>
                                <th className="px-4 py-3 font-medium">Team</th>
                                <th className="px-4 py-3 font-medium">Category</th>
                                <th className="px-4 py-3 font-medium">Manager</th>
                                <th className="px-4 py-3 font-medium">Status</th>
                                <th className="px-4 py-3 text-right font-medium">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {teams.data.map((team) => (
                                <tr key={team.id} className="transition hover:bg-muted/30">
                                    <td className="px-4 py-3">
                                        <Link
                                            href={`/dashboard/events/${event.id}/teams/${team.id}`}
                                            className="font-medium hover:underline"
                                        >
                                            {team.name}
                                        </Link>
                                    </td>
                                    <td className="px-4 py-3 text-muted-foreground">
                                        {team.basketball_event_category?.name ?? (
                                            <span className="italic">Unassigned</span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex flex-col">
                                            <span>{team.manager_name}</span>
                                            <span className="text-xs text-muted-foreground">
                                                {team.manager_phone}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <Badge variant={STATUS_VARIANT[team.status]}>
                                            {team.status}
                                        </Badge>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex justify-end gap-1">
                                            <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                                                <Link href={`/dashboard/events/${event.id}/teams/${team.id}/edit`}>
                                                    <Pencil className="h-4 w-4" />
                                                </Link>
                                            </Button>
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
                                                confirmationValue={team.name}
                                                description={
                                                    <>
                                                        This will permanently delete{' '}
                                                        <span className="font-semibold text-foreground">
                                                            {team.name}
                                                        </span>
                                                        . This action cannot be undone.
                                                    </>
                                                }
                                                onConfirm={() => handleDelete(team)}
                                            />
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Pagination */}
            {teams.last_page > 1 && (
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>
                        Showing {teams.from}–{teams.to} of {teams.total} teams
                    </span>
                    <div className="flex gap-1">
                        {teams.links.map((link, i) => (
                            <Button
                                key={i}
                                variant={link.active ? 'default' : 'outline'}
                                size="sm"
                                disabled={!link.url}
                                onClick={() => link.url && router.get(link.url, {}, { preserveScroll: true })}
                                dangerouslySetInnerHTML={{ __html: link.label }}
                            />
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}