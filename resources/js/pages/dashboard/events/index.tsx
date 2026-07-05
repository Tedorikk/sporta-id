import { Head, Link, router } from '@inertiajs/react';
import {
    Plus,
    Search,
    LayoutGrid,
    Calendar as CalendarIcon,
    MapPin,
    Phone,
    CalendarDays,
    Clock,
    CheckCircle2,
    Archive,
    Megaphone,
} from 'lucide-react';
import { useState, useEffect, useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardHeader,
    CardTitle,
    CardDescription,
    CardContent,
    CardFooter,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectTrigger,
    SelectValue,
    SelectContent,
    SelectItem,
} from '@/components/ui/select';
import { formatImageUrl } from '@/lib/image-utils';
import eventRoutes from '@/routes/events';
import type {
    Event,
    PaginatedEvents,
    EventFilters,
    EventStatus,
    EventStats,
} from '@/types/event';
import EventsCalendar from './partials/events-calendar';

type ViewMode = 'grid' | 'calendar';

interface Props {
    view: ViewMode;
    events: Event[] | PaginatedEvents;
    filters: EventFilters;
    categories: string[];
    stats: EventStats;
    month?: string;
}

const STATUS_STYLES: Record<EventStatus, string> = {
    upcoming:
        'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
    ongoing:
        'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
    past: 'bg-muted text-muted-foreground',
};

function formatDateRange(start: string, end: string) {
    const s = new Date(start);
    const e = new Date(end);
    const opts: Intl.DateTimeFormatOptions = {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    };

    if (start === end) {
        return s.toLocaleDateString(undefined, opts);
    }

    return `${s.toLocaleDateString(undefined, opts)} – ${e.toLocaleDateString(undefined, opts)}`;
}

export default function EventsIndex({
    view,
    events,
    filters,
    categories,
    stats,
    month,
}: Props) {
    const [search, setSearch] = useState(filters.search ?? '');

    const isPaginated = view === 'grid';
    const list: Event[] = isPaginated
        ? (events as PaginatedEvents).data
        : (events as Event[]);
    const pagination = isPaginated ? (events as PaginatedEvents) : null;
    const links = isPaginated ? (events as PaginatedEvents).links : [];

    // debounce search input -> query string
    useEffect(() => {
        const timeout = setTimeout(() => {
            if (search === (filters.search ?? '')) {
                return;
            }

            updateQuery({ search: search || undefined, page: undefined });
        }, 350);

        return () => clearTimeout(timeout);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [search]);

    function updateQuery(partial: Record<string, string | undefined>) {
        router.get(
            eventRoutes.index().url,
            {
                view,
                month,
                ...filters,
                ...partial,
            },
            { preserveState: true, preserveScroll: true, replace: true },
        );
    }

    function switchView(next: ViewMode) {
        router.get(
            eventRoutes.index().url,
            {
                ...filters,
                view: next,
                month:
                    next === 'calendar' ? (month ?? currentMonth()) : undefined,
            },
            { preserveState: true },
        );
    }

    function currentMonth() {
        const d = new Date();

        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    }

    const hasActiveFilters = !!(
        filters.search ||
        filters.category ||
        filters.status
    );

    const summary = useMemo(() => {
        if (isPaginated && pagination) {
            return pagination.total === 0
                ? 'No events found'
                : `Showing ${pagination.from}–${pagination.to} of ${pagination.total} events`;
        }

        return `${list.length} event${list.length === 1 ? '' : 's'} this month`;
    }, [isPaginated, pagination, list.length]);

    const statCards = [
        {
            label: 'Total events',
            value: stats.total,
            icon: CalendarDays,
            iconClass: 'bg-muted text-foreground',
        },
        {
            label: 'Published',
            value: stats.published,
            icon: Megaphone,
            iconClass:
                'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
        },
        {
            label: 'Upcoming',
            value: stats.upcoming,
            icon: Clock,
            iconClass:
                'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
        },
        {
            label: 'Ongoing',
            value: stats.ongoing,
            icon: CheckCircle2,
            iconClass:
                'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
        },
        {
            label: 'Past',
            value: stats.past,
            icon: Archive,
            iconClass: 'bg-muted text-muted-foreground',
        },
    ];

    return (
        <>
            <Head title="Events" />
            <div className="flex h-full flex-1 flex-col gap-6 overflow-x-auto rounded-xl px-12 py-4">
                <section
                    id="overview"
                    className="flex w-full flex-row items-start justify-between"
                >
                    <div>
                        <h1 className="scroll-m-20 text-4xl font-bold tracking-tight text-balance">
                            Overview
                        </h1>
                        <p className="mt-1 text-sm text-muted-foreground">
                            {summary}
                        </p>
                    </div>
                    <Button asChild>
                        <Link
                            href="/dashboard/events/create"
                            className="flex items-center gap-2"
                        >
                            <Plus className="size-4" /> Add New
                        </Link>
                    </Button>
                </section>

                <section
                    id="stats"
                    className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5"
                >
                    {statCards.map(
                        ({ label, value, icon: Icon, iconClass }) => (
                            <Card key={label}>
                                <CardContent className="flex items-center gap-3 py-2">
                                    <div
                                        className={`flex size-9 items-center justify-center rounded-md ${iconClass}`}
                                    >
                                        <Icon className="size-4.5" />
                                    </div>
                                    <div>
                                        <p className="text-2xl leading-none font-semibold">
                                            {value}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            {label}
                                        </p>
                                    </div>
                                </CardContent>
                            </Card>
                        ),
                    )}
                </section>

                <section
                    id="controls"
                    className="flex flex-wrap items-center gap-3"
                >
                    <div className="relative w-full max-w-xs">
                        <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search events..."
                            className="pl-9"
                        />
                    </div>

                    <Select
                        value={filters.category ?? 'all'}
                        onValueChange={(v) =>
                            updateQuery({
                                category: v === 'all' ? undefined : v,
                                page: undefined,
                            })
                        }
                    >
                        <SelectTrigger className="w-40">
                            <SelectValue placeholder="Category" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All categories</SelectItem>
                            {categories.map((c) => (
                                <SelectItem key={c} value={c}>
                                    {c}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Select
                        value={filters.status ?? 'all'}
                        onValueChange={(v) =>
                            updateQuery({
                                status: v === 'all' ? undefined : v,
                                page: undefined,
                            })
                        }
                    >
                        <SelectTrigger className="w-40">
                            <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All statuses</SelectItem>
                            <SelectItem value="upcoming">Upcoming</SelectItem>
                            <SelectItem value="ongoing">Ongoing</SelectItem>
                            <SelectItem value="past">Past</SelectItem>
                            <SelectItem value="published">Published</SelectItem>
                            <SelectItem value="draft">Draft</SelectItem>
                        </SelectContent>
                    </Select>

                    {hasActiveFilters && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                                setSearch('');
                                updateQuery({
                                    search: undefined,
                                    category: undefined,
                                    status: undefined,
                                    page: undefined,
                                });
                            }}
                        >
                            Clear filters
                        </Button>
                    )}

                    <div className="ml-auto flex items-center gap-1 rounded-md border p-1">
                        <Button
                            variant={view === 'grid' ? 'secondary' : 'ghost'}
                            size="sm"
                            onClick={() => switchView('grid')}
                            className="gap-1.5"
                        >
                            <LayoutGrid className="size-4" /> Grid
                        </Button>
                        <Button
                            variant={
                                view === 'calendar' ? 'secondary' : 'ghost'
                            }
                            size="sm"
                            onClick={() => switchView('calendar')}
                            className="gap-1.5"
                        >
                            <CalendarIcon className="size-4" /> Calendar
                        </Button>
                    </div>
                </section>

                {view === 'calendar' ? (
                    <EventsCalendar
                        events={list}
                        month={month ?? currentMonth()}
                        filters={filters}
                    />
                ) : (
                    <>
                        <section
                            id="index"
                            className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3"
                        >
                            {list.length === 0 && (
                                <div className="col-span-full flex flex-col items-center gap-2 py-16 text-muted-foreground">
                                    <CalendarDays className="size-10 opacity-40" />
                                    <p>No events match your filters.</p>
                                </div>
                            )}

                            {list.map((event) => (
                                <Card
                                    key={event.id}
                                    className="relative flex flex-col overflow-hidden pt-0"
                                >
                                    <div className="relative aspect-video w-full">
                                        <div className="absolute inset-0 z-10 bg-black/35" />
                                        <img
                                            src={
                                                event.banner
                                                    ? formatImageUrl(
                                                          event.banner,
                                                      )
                                                    : undefined
                                            }
                                            alt="Event cover"
                                            className="h-full w-full object-cover"
                                        />
                                        <div className="absolute top-3 left-3 z-20 flex gap-2">
                                            <Badge
                                                className={
                                                    STATUS_STYLES[event.status]
                                                }
                                            >
                                                {event.status}
                                            </Badge>
                                            {!event.is_published && (
                                                <Badge
                                                    variant="outline"
                                                    className="bg-background/80"
                                                >
                                                    Draft
                                                </Badge>
                                            )}
                                        </div>
                                    </div>

                                    <CardHeader>
                                        <CardTitle className="line-clamp-1">
                                            {event.name}
                                        </CardTitle>
                                        <CardDescription className="line-clamp-2">
                                            {event.description ||
                                                'No description provided.'}
                                        </CardDescription>
                                    </CardHeader>

                                    <CardContent className="flex flex-col gap-2 text-sm">
                                        <div className="flex items-center gap-2 text-muted-foreground">
                                            <CalendarDays className="size-4" />
                                            {formatDateRange(
                                                event.start_date,
                                                event.end_date,
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2 text-muted-foreground">
                                            <MapPin className="size-4" />
                                            {event.category}
                                        </div>
                                        <div className="flex items-center gap-2 text-muted-foreground">
                                            <Phone className="size-4" />
                                            {event.contact_person}
                                        </div>
                                    </CardContent>

                                    <CardFooter>
                                        <Button className="w-full" asChild>
                                            <Link
                                                href={`/dashboard/events/${event.id}`}
                                            >
                                                View Event
                                            </Link>
                                        </Button>
                                    </CardFooter>
                                </Card>
                            ))}
                        </section>

                        {pagination && pagination.last_page > 1 && (
                            <nav className="flex items-center justify-center gap-1 py-4">
                                {links.map((link, i) => (
                                    <Button
                                        key={i}
                                        variant={
                                            link.active ? 'default' : 'outline'
                                        }
                                        size="sm"
                                        disabled={!link.url}
                                        onClick={() =>
                                            link.url &&
                                            router.visit(link.url, {
                                                preserveState: true,
                                                preserveScroll: true,
                                            })
                                        }
                                        dangerouslySetInnerHTML={{
                                            __html: link.label,
                                        }}
                                    />
                                ))}
                            </nav>
                        )}
                    </>
                )}
            </div>
        </>
    );
}

EventsIndex.layout = {
    breadcrumbs: [
        {
            title: 'Events',
            href: eventRoutes.index(),
        },
    ],
};
