import { Head, Link, router } from '@inertiajs/react';
import {
    CalendarDays,
    Calendar as CalendarIcon,
    LayoutGrid,
    Plus,
    Rows3,
    Search,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { usePersistedPreferences } from '@/hooks/use-persisted-preferences';
import eventRoutes from '@/routes/events';
import type {
    Event,
    EventFilters,
    EventSort,
    EventSortColumn,
    EventStats,
    PaginatedEvents,
} from '@/types/event';
import { EventBulkActions } from './partials/event-bulk-actions';
import { EventFacetTiles } from './partials/event-facet-tiles';
import { EventFilterChips } from './partials/event-filter-chips';
import { EventPeekPanel } from './partials/event-peek-panel';
import {
    DEFAULT_TABLE_PREFERENCES,
    EventTableOptions,
} from './partials/event-table-options';
import EventsCalendar from './partials/events-calendar';
import { EventsGrid } from './partials/events-grid';
import { EventsPagination } from './partials/events-pagination';
import { EventsTable } from './partials/events-table';

type ViewMode = 'table' | 'grid' | 'calendar';

interface Props {
    view: ViewMode;
    events: Event[] | PaginatedEvents;
    filters: EventFilters;
    sort: EventSort;
    categories: string[];
    stats: EventStats;
    has_any_events: boolean;
    month?: string;
}

/** Dates read newest-first; names read A–Z. */
const DEFAULT_DIRECTION: Record<EventSortColumn, 'asc' | 'desc'> = {
    name: 'asc',
    start_date: 'desc',
    end_date: 'desc',
};

function currentMonth() {
    const d = new Date();

    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export default function EventsIndex({
    view,
    events,
    filters,
    sort,
    categories,
    stats,
    has_any_events: hasAnyEvents,
    month,
}: Props) {
    const [search, setSearch] = useState(filters.search ?? '');
    /** Selection is per page: any navigation clears it rather than carrying stale ids. */
    const [selectedIds, setSelectedIds] = useState<number[]>([]);
    const [pendingIds, setPendingIds] = useState<number[]>([]);
    const [isBulkWorking, setIsBulkWorking] = useState(false);
    /** Held as an id, not the row itself, so the panel re-reads fresh props after a write. */
    const [peekId, setPeekId] = useState<number | null>(null);
    const [tablePreferences, updateTablePreferences] = usePersistedPreferences(
        'events-table-preferences',
        DEFAULT_TABLE_PREFERENCES,
    );

    const isPaginated = view !== 'calendar';
    const list: Event[] = isPaginated
        ? (events as PaginatedEvents).data
        : (events as Event[]);
    const pagination = isPaginated ? (events as PaginatedEvents) : null;

    // debounce search input -> query string
    useEffect(() => {
        const timeout = setTimeout(() => {
            if (search === (filters.search ?? '')) {
                return;
            }

            updateQuery({ search: search || null, page: undefined });
        }, 350);

        return () => clearTimeout(timeout);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [search]);

    /** Unset facets are dropped so the address bar shows only what is actually applied. */
    function compact(
        params: Record<string, string | number | null | undefined>,
    ): Record<string, string | number> {
        return Object.fromEntries(
            Object.entries(params).filter(
                (entry): entry is [string, string | number] =>
                    entry[1] !== null &&
                    entry[1] !== undefined &&
                    entry[1] !== '',
            ),
        );
    }

    function updateQuery(
        partial: Partial<EventFilters> & {
            view?: ViewMode;
            month?: string | null;
            sort?: EventSortColumn;
            direction?: 'asc' | 'desc';
            page?: number;
        },
    ) {
        setSelectedIds([]);
        router.get(
            eventRoutes.index().url,
            compact({
                view,
                month,
                sort: sort.column,
                direction: sort.direction,
                ...filters,
                ...partial,
            }),
            { preserveState: true, preserveScroll: true, replace: true },
        );
    }

    function switchView(next: ViewMode) {
        setSelectedIds([]);
        router.get(
            eventRoutes.index().url,
            compact({
                ...filters,
                sort: sort.column,
                direction: sort.direction,
                view: next,
                month: next === 'calendar' ? (month ?? currentMonth()) : null,
            }),
            { preserveState: true },
        );
    }

    function setPublication(ids: number[], isPublished: boolean) {
        router.patch(
            '/dashboard/events/publication',
            { ids, is_published: isPublished },
            {
                preserveScroll: true,
                preserveState: true,
                onStart: () => setPendingIds(ids),
                onFinish: () => setPendingIds([]),
            },
        );
    }

    function bulkPublication(isPublished: boolean) {
        router.patch(
            '/dashboard/events/publication',
            { ids: selectedIds, is_published: isPublished },
            {
                preserveScroll: true,
                preserveState: true,
                onStart: () => setIsBulkWorking(true),
                onSuccess: () => setSelectedIds([]),
                onFinish: () => setIsBulkWorking(false),
            },
        );
    }

    function bulkDelete() {
        router.delete('/dashboard/events', {
            data: { ids: selectedIds },
            preserveScroll: true,
            preserveState: true,
            onStart: () => setIsBulkWorking(true),
            onSuccess: () => setSelectedIds([]),
            onFinish: () => setIsBulkWorking(false),
        });
    }

    function goToPage(page: number) {
        updateQuery({ page });
    }

    function toggleSort(column: EventSortColumn) {
        const direction =
            sort.column === column
                ? sort.direction === 'asc'
                    ? 'desc'
                    : 'asc'
                : DEFAULT_DIRECTION[column];

        updateQuery({ sort: column, direction, page: undefined });
    }

    function clearFilters() {
        setSearch('');
        updateQuery({
            search: null,
            category: null,
            lifecycle: null,
            timing: null,
            page: undefined,
        });
    }

    const peekEvent = list.find((event) => event.id === peekId) ?? null;

    const summary = useMemo(() => {
        if (pagination) {
            return pagination.total === 0
                ? 'No events found'
                : `Showing ${pagination.from}–${pagination.to} of ${pagination.total} events`;
        }

        return `${list.length} event${list.length === 1 ? '' : 's'} this month`;
    }, [pagination, list.length]);

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

                <section id="facets">
                    <EventFacetTiles
                        stats={stats}
                        filters={filters}
                        onChange={(partial) =>
                            updateQuery({ ...partial, page: undefined })
                        }
                    />
                </section>

                <section
                    id="controls"
                    className="flex flex-wrap items-center gap-3"
                >
                    <div className="relative w-full max-w-xs">
                        <Label htmlFor="event-search" className="sr-only">
                            Search events
                        </Label>
                        <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            id="event-search"
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
                                category: v === 'all' ? null : v,
                                page: undefined,
                            })
                        }
                    >
                        <SelectTrigger className="w-40" aria-label="Category">
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

                    {view === 'table' && (
                        <div className="ml-auto">
                            <EventTableOptions
                                preferences={tablePreferences}
                                onChange={updateTablePreferences}
                            />
                        </div>
                    )}

                    <ToggleGroup
                        type="single"
                        value={view}
                        onValueChange={(next) =>
                            next && switchView(next as ViewMode)
                        }
                        variant="outline"
                        size="sm"
                        aria-label="View"
                        className={view === 'table' ? undefined : 'ml-auto'}
                    >
                        <ToggleGroupItem value="table" className="gap-1.5 px-3">
                            <Rows3 className="size-4" /> Table
                        </ToggleGroupItem>
                        <ToggleGroupItem value="grid" className="gap-1.5 px-3">
                            <LayoutGrid className="size-4" /> Grid
                        </ToggleGroupItem>
                        <ToggleGroupItem
                            value="calendar"
                            className="gap-1.5 px-3"
                        >
                            <CalendarIcon className="size-4" /> Calendar
                        </ToggleGroupItem>
                    </ToggleGroup>
                </section>

                <EventFilterChips
                    filters={filters}
                    onRemove={(partial) => {
                        if ('search' in partial) {
                            setSearch('');
                        }

                        updateQuery({ ...partial, page: undefined });
                    }}
                    onClearAll={clearFilters}
                />

                {selectedIds.length > 0 && view === 'table' && (
                    <EventBulkActions
                        count={selectedIds.length}
                        isWorking={isBulkWorking}
                        onPublish={() => bulkPublication(true)}
                        onUnpublish={() => bulkPublication(false)}
                        onDelete={bulkDelete}
                        onClear={() => setSelectedIds([])}
                    />
                )}

                {view === 'calendar' ? (
                    <EventsCalendar
                        events={list}
                        month={month ?? currentMonth()}
                        filters={filters}
                    />
                ) : list.length === 0 ? (
                    <EmptyState
                        hasAnyEvents={hasAnyEvents}
                        onClearFilters={clearFilters}
                    />
                ) : (
                    <>
                        {view === 'table' ? (
                            <EventsTable
                                events={list}
                                sort={sort}
                                onSort={toggleSort}
                                selectedIds={selectedIds}
                                onSelectedIdsChange={setSelectedIds}
                                onTogglePublication={(event, published) =>
                                    setPublication([event.id], published)
                                }
                                onPeek={(event) => setPeekId(event.id)}
                                pendingIds={pendingIds}
                                preferences={tablePreferences}
                            />
                        ) : (
                            <EventsGrid
                                events={list}
                                onPeek={(event) => setPeekId(event.id)}
                                onTogglePublication={(event, published) =>
                                    setPublication([event.id], published)
                                }
                                pendingIds={pendingIds}
                            />
                        )}

                        {pagination && pagination.last_page > 1 && (
                            <EventsPagination
                                currentPage={pagination.current_page}
                                lastPage={pagination.last_page}
                                from={pagination.from}
                                to={pagination.to}
                                total={pagination.total}
                                onNavigate={goToPage}
                            />
                        )}
                    </>
                )}

                <EventPeekPanel
                    event={peekEvent}
                    isPublicationPending={
                        peekId !== null && pendingIds.includes(peekId)
                    }
                    onOpenChange={(open) => !open && setPeekId(null)}
                    onTogglePublication={(event, published) =>
                        setPublication([event.id], published)
                    }
                />
            </div>
        </>
    );
}

function EmptyState({
    hasAnyEvents,
    onClearFilters,
}: {
    hasAnyEvents: boolean;
    onClearFilters: () => void;
}) {
    return (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed py-20 text-center">
            <CalendarDays className="size-10 text-muted-foreground opacity-40" />
            {hasAnyEvents ? (
                <>
                    <p className="font-medium">
                        No events match these filters.
                    </p>
                    <p className="max-w-sm text-sm text-muted-foreground">
                        Try a different combination, or start over.
                    </p>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={onClearFilters}
                    >
                        Clear filters
                    </Button>
                </>
            ) : (
                <>
                    <p className="font-medium">No events yet</p>
                    <p className="max-w-sm text-sm text-muted-foreground">
                        Create your first event to start taking registrations
                        and issuing ID cards.
                    </p>
                    <Button size="sm" asChild>
                        <Link href="/dashboard/events/create">
                            <Plus className="mr-2 size-4" /> Create your first
                            event
                        </Link>
                    </Button>
                </>
            )}
        </div>
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
