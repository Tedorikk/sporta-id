import { Head, Link } from '@inertiajs/react';
import { CheckCircle2, ChevronLeft, Circle, Swords } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import events from '@/routes/events';
import type { Event } from '@/types/event';
import type { GameMatch, MatchStatus } from '@/types/game-match';
import { CreateEventMatchDialog } from './components/create-event-match-dialog';
import { EventMatchRow } from './components/event-match-row';
import type { CategoryWithFixtures } from './types';

interface Props {
    event: Event;
    matches: GameMatch[];
    categories: CategoryWithFixtures[];
}

type GroupBy = 'day' | 'none';
type StatusFilter = 'all' | MatchStatus;

const UNSCHEDULED_KEY = 'unscheduled';

function dayKey(match: GameMatch) {
    return match.scheduled_at ? match.scheduled_at.slice(0, 10) : UNSCHEDULED_KEY;
}

function dayLabel(key: string) {
    if (key === UNSCHEDULED_KEY) {
        return 'Unscheduled';
    }

    return new Date(key).toLocaleDateString(undefined, {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    });
}

export default function EventMatchesIndex({ event, matches, categories }: Props) {
    const [categoryFilter, setCategoryFilter] = useState('all');
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
    const [groupBy, setGroupBy] = useState<GroupBy>('day');

    const categoryMap = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);

    const filteredMatches = matches.filter((match) => {
        if (categoryFilter !== 'all' && String(match.category?.id) !== categoryFilter) {
            return false;
        }
        if (statusFilter !== 'all' && match.status !== statusFilter) {
            return false;
        }
        return true;
    });

    const groups = useMemo(() => {
        if (groupBy === 'none') {
            return null;
        }

        const map = new Map<string, GameMatch[]>();
        filteredMatches.forEach((match) => {
            const key = dayKey(match);
            const list = map.get(key) ?? [];
            list.push(match);
            map.set(key, list);
        });

        return Array.from(map.entries()).sort(([a], [b]) => {
            if (a === UNSCHEDULED_KEY) return 1;
            if (b === UNSCHEDULED_KEY) return -1;
            return a.localeCompare(b);
        });
    }, [filteredMatches, groupBy]);

    const stats = [
        { label: 'Total', value: matches.length, icon: <Swords className="h-4 w-4" /> },
        { label: 'Completed', value: matches.filter((m) => m.status === 'finished').length, icon: <CheckCircle2 className="h-4 w-4 text-emerald-500" /> },
        { label: 'Remaining', value: matches.filter((m) => m.status !== 'finished').length, icon: <Circle className="h-4 w-4 text-muted-foreground" /> },
    ];

    return (
        <>
            <Head title={`All Matches — ${event.name}`} />

            <div className="mx-auto flex h-full w-full max-w-5xl flex-col gap-6 px-4 py-6 md:px-8 md:py-8">
                <div className="flex items-start gap-4">
                    <Button variant="outline" size="icon" className="mt-1 h-9 w-9 shrink-0" asChild>
                        <Link href={`/dashboard/events/${event.id}`}>
                            <ChevronLeft className="h-4 w-4" />
                        </Link>
                    </Button>
                    <div className="flex-1 min-w-0">
                        <h1 className="text-2xl font-bold tracking-tight">All Matches</h1>
                        <p className="text-sm text-muted-foreground mt-0.5">{event.name}</p>
                    </div>

                    <CreateEventMatchDialog event={event} categories={categories} />
                </div>

                <div className="grid grid-cols-3 gap-3">
                    {stats.map(({ label, value, icon }) => (
                        <div key={label} className="rounded-lg border bg-card px-4 py-3 shadow-sm flex items-center gap-3">
                            <div className="rounded-md bg-muted p-2 text-muted-foreground">{icon}</div>
                            <div>
                                <p className="text-xl font-bold">{value}</p>
                                <p className="text-xs text-muted-foreground">{label}</p>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                        <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Category" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Categories</SelectItem>
                            {categories.map((category) => (
                                <SelectItem key={category.id} value={String(category.id)}>
                                    {category.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
                        <SelectTrigger className="w-[150px]">
                            <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Statuses</SelectItem>
                            <SelectItem value="scheduled">Scheduled</SelectItem>
                            <SelectItem value="ongoing">Ongoing</SelectItem>
                            <SelectItem value="finished">Completed</SelectItem>
                        </SelectContent>
                    </Select>

                    <Select value={groupBy} onValueChange={(v) => setGroupBy(v as GroupBy)}>
                        <SelectTrigger className="w-[150px]">
                            <SelectValue placeholder="Group by" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="day">Group by Day</SelectItem>
                            <SelectItem value="none">No Grouping</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                {filteredMatches.length === 0 ? (
                    <div className="py-16 text-center border border-dashed rounded-xl text-muted-foreground">
                        <Swords className="mx-auto h-8 w-8 mb-3 opacity-40" />
                        <p className="text-sm font-medium">No matches found</p>
                        <p className="text-sm mt-1">
                            {matches.length === 0 ? 'No matches have been created for this event yet.' : 'Try adjusting the filters above.'}
                        </p>
                    </div>
                ) : groups ? (
                    <div className="flex flex-col gap-6">
                        {groups.map(([key, dayMatches]) => (
                            <div key={key} className="flex flex-col gap-2">
                                <h2 className="text-sm font-semibold text-muted-foreground">{dayLabel(key)}</h2>
                                <div className="flex flex-col gap-2">
                                    {dayMatches.map((match) => (
                                        <EventMatchRow
                                            key={match.id}
                                            event={event}
                                            match={match}
                                            pools={categoryMap.get(match.category?.id ?? -1)?.pools ?? []}
                                            teams={categoryMap.get(match.category?.id ?? -1)?.teams ?? []}
                                        />
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-col gap-2">
                        {filteredMatches.map((match) => (
                            <EventMatchRow
                                key={match.id}
                                event={event}
                                match={match}
                                pools={categoryMap.get(match.category?.id ?? -1)?.pools ?? []}
                                teams={categoryMap.get(match.category?.id ?? -1)?.teams ?? []}
                            />
                        ))}
                    </div>
                )}
            </div>
        </>
    );
}

EventMatchesIndex.layout = {
    breadcrumbs: [
        { title: 'Events', href: events.index() },
        { title: 'Event', href: '#' },
        { title: 'All Matches', href: '#' },
    ],
};
