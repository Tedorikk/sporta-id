import { Head, Link, router } from '@inertiajs/react';
import { ChevronLeft, Plus, Pencil, Trash2, Search, CheckCircle, XCircle, Clock, Eye } from 'lucide-react';
import { useState } from 'react';
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { BasketballEventCategory } from '@/types/basketball-event-category';
import type { Event } from '@/types/event';
import { TEAM_STATUSES } from '@/types/team';
import type { Team } from '@/types/team';

interface TeamsIndexProps {
    event: Event;
    teams: {
        data: Team[];
        links: { url: string | null; label: string; active: boolean }[];
    };
    filters: { search?: string; category?: string; status?: string };
    categories: BasketballEventCategory[];
}

const ALL_VALUE = 'all';

export default function TeamsIndex({ event, teams, filters, categories }: TeamsIndexProps) {
    const [search, setSearch] = useState(filters.search || '');

    const applyFilters = (next: Partial<TeamsIndexProps['filters']>) => {
        router.get(
            `/dashboard/events/${event.id}/teams`,
            { ...filters, ...next, search },
            { preserveState: true, preserveScroll: true },
        );
    };

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        applyFilters({ search });
    };

    return (
        <div className="mx-auto flex h-full w-full max-w-6xl flex-1 flex-col gap-8 overflow-x-hidden px-4 py-6 md:px-8 md:py-8">
            <Head title={`Teams - ${event.name}`} />

            <section className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-4">
                    <Button variant="outline" size="icon" className="mt-1 h-10 w-10 shrink-0" asChild>
                        <Link href={`/dashboard/events/${event.id}`}>
                            <ChevronLeft className="h-5 w-5" />
                        </Link>
                    </Button>
                    <div className="flex flex-col gap-2">
                        <h1 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
                            Team Management
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            Manage team participated in {event.name}
                        </p>
                    </div>
                </div>
                <Button asChild>
                    <Link href={`/dashboard/events/${event.id}/teams/create`}>
                        <Plus className="mr-2 h-4 w-4" />
                        Add New Team
                    </Link>
                </Button>
            </section>

            <section className="flex flex-col gap-4 rounded-xl border bg-card p-6 shadow-sm">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <form onSubmit={handleSearch} className="relative w-full max-w-sm">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground ml-2" />
                        <Input
                            type="search"
                            placeholder="Find team by name..."
                            className="pl-10"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </form>

                    <div className="flex gap-2">
                        <Select
                            value={filters.category || ALL_VALUE}
                            onValueChange={(value) =>
                                applyFilters({ category: value === ALL_VALUE ? undefined : value })
                            }
                        >
                            <SelectTrigger className="w-[180px] cursor-pointer">
                                <SelectValue placeholder="All Categories" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value={ALL_VALUE} className="cursor-pointer">
                                    All Categories
                                </SelectItem>
                                {categories.map((category) => (
                                    <SelectItem
                                        key={category.id}
                                        value={String(category.id)}
                                        className="cursor-pointer"
                                    >
                                        {category.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        <Select
                            value={filters.status || ALL_VALUE}
                            onValueChange={(value) =>
                                applyFilters({ status: value === ALL_VALUE ? undefined : value })
                            }
                        >
                            <SelectTrigger className="w-[160px] cursor-pointer">
                                <SelectValue placeholder="All Status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value={ALL_VALUE} className="cursor-pointer">
                                    All Status
                                </SelectItem>
                                {TEAM_STATUSES.map((option) => (
                                    <SelectItem
                                        key={option.value}
                                        value={option.value}
                                        className="cursor-pointer"
                                    >
                                        {option.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <div className="rounded-md border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Team Name</TableHead>
                                <TableHead>Category</TableHead>
                                <TableHead>Manager</TableHead>
                                <TableHead>Contact</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Action</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {teams.data.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="h-24 text-center">
                                        No team found.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                teams.data.map((team) => (
                                    <TableRow key={team.id}>
                                        <TableCell className="font-medium">
                                            <div className="flex items-center gap-3">
                                                {team.logo ? (
                                                    <img src={team.logo} alt={team.name} className="h-8 w-8 rounded-full object-cover" />
                                                ) : (
                                                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-xs">
                                                        {team.name.substring(0, 2).toUpperCase()}
                                                    </div>
                                                )}
                                                {team.name}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            {team.basketball_event_category?.name ?? '-'}
                                        </TableCell>
                                        <TableCell>{team.manager_name}</TableCell>
                                        <TableCell>{team.manager_phone}</TableCell>
                                        <TableCell>
                                            {team.status === 'verified' && (
                                                <Badge variant="default" className="bg-emerald-500 hover:bg-emerald-600"><CheckCircle className="mr-1 h-3 w-3" /> Verified</Badge>
                                            )}
                                            {team.status === 'pending' && (
                                                <Badge variant="secondary"><Clock className="mr-1 h-3 w-3" /> Waiting</Badge>
                                            )}
                                            {team.status === 'rejected' && (
                                                <Badge variant="destructive"><XCircle className="mr-1 h-3 w-3" /> Rejected</Badge>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-2">
                                                <Button variant="ghost" size="icon" asChild>
                                                    <Link href={`/dashboard/events/${event.id}/teams/${team.id}/edit`}>
                                                        <Pencil className="h-4 w-4" />
                                                    </Link>
                                                </Button>
                                                <Button variant="ghost" size="icon" asChild>
                                                    <Link href={`/dashboard/events/${event.id}/teams/${team.id}`}>
                                                        <Eye className="h-4 w-4" />
                                                    </Link>
                                                </Button>
                                                <DeleteConfirmationDialog
                                                    trigger={
                                                        <Button variant="ghost" size="icon" className="text-destructive">
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    }
                                                    confirmationValue={team.name}
                                                    description={
                                                        <>
                                                            This will delete the team <span className="font-semibold">{team.name}</span> permanently.
                                                        </>
                                                    }
                                                    onConfirm={() => {
                                                        router.delete(`/dashboard/events/${event.id}/teams/${team.id}`);
                                                    }}
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

TeamsIndex.layout = {
    breadcrumbs: [
        { title: 'Events', href: '/dashboard/events' },
        { title: 'Teams', href: '#' },
    ],
};