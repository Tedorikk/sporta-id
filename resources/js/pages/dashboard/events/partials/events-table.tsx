import { Link } from '@inertiajs/react';
import {
    ArrowDown,
    ArrowUp,
    ChevronsUpDown,
    PanelRightOpen,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { EventBanner } from '@/components/event-banner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { formatDate } from '@/lib/format-date';
import { cn } from '@/lib/utils';
import type { Event, EventSort, EventSortColumn } from '@/types/event';
import { EventTimingBadge } from './event-badges';
import { EVENT_COLUMNS } from './event-table-options';
import type {
    EventColumnKey,
    EventTablePreferences,
} from './event-table-options';

interface Props {
    events: Event[];
    sort: EventSort;
    onSort: (column: EventSortColumn) => void;
    selectedIds: number[];
    onSelectedIdsChange: (ids: number[]) => void;
    onTogglePublication: (event: Event, published: boolean) => void;
    onPeek: (event: Event) => void;
    /** Ids with a publication change in flight, so their switch cannot be double-fired. */
    pendingIds: number[];
    preferences: EventTablePreferences;
}

interface ColumnDef {
    label: string;
    /** Present when the list can be ordered by this column. */
    sortBy?: EventSortColumn;
    alignRight?: boolean;
    cell: (event: Event) => ReactNode;
}

export function EventsTable({
    events,
    sort,
    onSort,
    selectedIds,
    onSelectedIdsChange,
    onTogglePublication,
    onPeek,
    pendingIds,
    preferences,
}: Props) {
    const isCompact = preferences.density === 'compact';
    const cellPadding = isCompact ? 'py-1' : 'py-2.5';

    // Header and body are generated from one definition each, so a hidden column
    // can never leave the two out of step.
    const definitions: Record<EventColumnKey, ColumnDef> = {
        category: {
            label: 'Category',
            cell: (event) =>
                event.category ? (
                    <Badge variant="outline">{event.category}</Badge>
                ) : (
                    <span className="text-muted-foreground">—</span>
                ),
        },
        start_date: {
            label: 'Starts',
            sortBy: 'start_date',
            cell: (event) => (
                <span className="text-muted-foreground tabular-nums">
                    {formatDate(event.start_date)}
                </span>
            ),
        },
        end_date: {
            label: 'Ends',
            sortBy: 'end_date',
            cell: (event) => (
                <span className="text-muted-foreground tabular-nums">
                    {formatDate(event.end_date)}
                </span>
            ),
        },
        timing: {
            label: 'Timing',
            cell: (event) => <EventTimingBadge status={event.status} />,
        },
        publication: {
            label: 'Published',
            // Edited in place: publishing is the most common single change and
            // does not deserve a page load.
            cell: (event) => (
                <div className="flex items-center gap-2">
                    <Switch
                        checked={event.is_published}
                        disabled={pendingIds.includes(event.id)}
                        onCheckedChange={(checked) =>
                            onTogglePublication(event, checked)
                        }
                        aria-label={`Publish ${event.name}`}
                    />
                    <span
                        className={cn(
                            'text-xs',
                            event.is_published
                                ? 'text-foreground'
                                : 'text-muted-foreground',
                        )}
                    >
                        {event.is_published ? 'Published' : 'Draft'}
                    </span>
                </div>
            ),
        },
        attendees: {
            label: 'Attendees',
            alignRight: true,
            cell: (event) => (
                <span className="tabular-nums">
                    {event.attendees_count ?? 0}
                </span>
            ),
        },
    };

    const columns = EVENT_COLUMNS.filter(
        ({ key }) => !preferences.hiddenColumns.includes(key),
    ).map(({ key }) => ({ key, ...definitions[key] }));

    const pageIds = events.map((event) => event.id);
    const selectedOnPage = pageIds.filter((id) => selectedIds.includes(id));
    const headerState =
        selectedOnPage.length === 0
            ? false
            : selectedOnPage.length === pageIds.length
              ? true
              : 'indeterminate';

    function toggleAll(checked: boolean) {
        onSelectedIdsChange(
            checked
                ? [...new Set([...selectedIds, ...pageIds])]
                : selectedIds.filter((id) => !pageIds.includes(id)),
        );
    }

    function toggleOne(id: number, checked: boolean) {
        onSelectedIdsChange(
            checked
                ? [...selectedIds, id]
                : selectedIds.filter((selected) => selected !== id),
        );
    }

    return (
        // Own scroll container so the header can actually freeze while comparing rows.
        <div className="max-h-[calc(100vh-22rem)] overflow-auto rounded-xl border">
            <Table>
                <TableHeader className="sticky top-0 z-10 bg-background shadow-[inset_0_-1px_0_var(--border)]">
                    <TableRow className="hover:bg-transparent">
                        <TableHead className="w-10">
                            <Checkbox
                                checked={headerState}
                                onCheckedChange={(checked) =>
                                    toggleAll(checked === true)
                                }
                                aria-label="Select all events on this page"
                            />
                        </TableHead>

                        <SortableHead
                            column="name"
                            label="Event"
                            sort={sort}
                            onSort={onSort}
                            className="min-w-64"
                        />

                        {columns.map((column) =>
                            column.sortBy ? (
                                <SortableHead
                                    key={column.key}
                                    column={column.sortBy}
                                    label={column.label}
                                    sort={sort}
                                    onSort={onSort}
                                />
                            ) : (
                                <TableHead
                                    key={column.key}
                                    className={cn(
                                        column.alignRight && 'text-right',
                                    )}
                                >
                                    {column.label}
                                </TableHead>
                            ),
                        )}

                        <TableHead className="w-10">
                            <span className="sr-only">Quick view</span>
                        </TableHead>
                    </TableRow>
                </TableHeader>

                <TableBody>
                    {events.map((event) => {
                        const isSelected = selectedIds.includes(event.id);

                        return (
                            <TableRow
                                key={event.id}
                                data-state={isSelected ? 'selected' : undefined}
                                className={cn(
                                    !isSelected && 'even:bg-muted/20',
                                )}
                            >
                                <TableCell className={cellPadding}>
                                    <Checkbox
                                        checked={isSelected}
                                        onCheckedChange={(checked) =>
                                            toggleOne(
                                                event.id,
                                                checked === true,
                                            )
                                        }
                                        aria-label={`Select ${event.name}`}
                                    />
                                </TableCell>

                                <TableCell className={cellPadding}>
                                    <div className="flex items-center gap-3">
                                        <Thumbnail
                                            event={event}
                                            compact={isCompact}
                                        />
                                        <Link
                                            href={`/dashboard/events/${event.id}`}
                                            className="truncate font-medium hover:underline"
                                        >
                                            {event.name}
                                        </Link>
                                    </div>
                                </TableCell>

                                {columns.map((column) => (
                                    <TableCell
                                        key={column.key}
                                        className={cn(
                                            cellPadding,
                                            column.alignRight && 'text-right',
                                        )}
                                    >
                                        {column.cell(event)}
                                    </TableCell>
                                ))}

                                <TableCell className={cellPadding}>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="size-8"
                                        data-peek-trigger
                                        onClick={() => onPeek(event)}
                                    >
                                        <PanelRightOpen className="size-4" />
                                        <span className="sr-only">
                                            Quick view {event.name}
                                        </span>
                                    </Button>
                                </TableCell>
                            </TableRow>
                        );
                    })}
                </TableBody>
            </Table>
        </div>
    );
}

function Thumbnail({ event, compact }: { event: Event; compact: boolean }) {
    return (
        <EventBanner
            banner={event.banner}
            showLabel={false}
            className={cn(
                'shrink-0 overflow-hidden rounded-md',
                compact ? 'size-6' : 'size-10',
            )}
        />
    );
}

function SortableHead({
    column,
    label,
    sort,
    onSort,
    className,
}: {
    column: EventSortColumn;
    label: string;
    sort: EventSort;
    onSort: (column: EventSortColumn) => void;
    className?: string;
}) {
    const isSorted = sort.column === column;
    const Icon = !isSorted
        ? ChevronsUpDown
        : sort.direction === 'asc'
          ? ArrowUp
          : ArrowDown;

    return (
        <TableHead
            className={className}
            aria-sort={
                isSorted
                    ? sort.direction === 'asc'
                        ? 'ascending'
                        : 'descending'
                    : 'none'
            }
        >
            <button
                type="button"
                onClick={() => onSort(column)}
                className="-mx-2 flex items-center gap-1.5 rounded px-2 py-1 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            >
                {label}
                <Icon
                    className={cn(
                        'size-3.5',
                        isSorted ? 'text-foreground' : 'text-muted-foreground',
                    )}
                />
            </button>
        </TableHead>
    );
}
