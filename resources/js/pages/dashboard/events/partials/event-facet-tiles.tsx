import {
    Archive,
    CalendarRange,
    CircleDot,
    Clock,
    Layers,
    Megaphone,
    PencilLine,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type {
    EventFilters,
    EventLifecycle,
    EventStats,
    EventTiming,
} from '@/types/event';

interface Tile<T> {
    /** null is the "no filter on this facet" tile. */
    value: T | null;
    label: string;
    count: number;
    icon: typeof Clock;
    iconClass: string;
}

interface Props {
    stats: EventStats;
    filters: EventFilters;
    onChange: (partial: Partial<EventFilters>) => void;
}

/**
 * The counts double as the filter controls: every tile states how many events
 * clicking it will return, and each count already accounts for the *other*
 * facet, so no tile can lead to an empty result.
 */
export function EventFacetTiles({ stats, filters, onChange }: Props) {
    const lifecycleTiles: Tile<EventLifecycle>[] = [
        {
            value: null,
            label: 'Any state',
            count: stats.published + stats.draft,
            icon: Layers,
            iconClass: 'bg-muted text-foreground',
        },
        {
            value: 'published',
            label: 'Published',
            count: stats.published,
            icon: Megaphone,
            iconClass:
                'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
        },
        {
            value: 'draft',
            label: 'Draft',
            count: stats.draft,
            icon: PencilLine,
            iconClass:
                'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
        },
    ];

    const timingTiles: Tile<EventTiming>[] = [
        {
            value: null,
            label: 'Any time',
            count: stats.upcoming + stats.ongoing + stats.past,
            icon: CalendarRange,
            iconClass: 'bg-muted text-foreground',
        },
        {
            value: 'upcoming',
            label: 'Upcoming',
            count: stats.upcoming,
            icon: Clock,
            iconClass:
                'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
        },
        {
            value: 'ongoing',
            label: 'Ongoing',
            count: stats.ongoing,
            icon: CircleDot,
            iconClass:
                'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
        },
        {
            value: 'past',
            label: 'Past',
            count: stats.past,
            icon: Archive,
            iconClass: 'bg-muted text-muted-foreground',
        },
    ];

    return (
        <div className="grid min-w-0 gap-4 lg:grid-cols-[3fr_4fr]">
            <FacetGroup
                legend="Publication"
                tiles={lifecycleTiles}
                active={filters.lifecycle}
                onSelect={(value) => onChange({ lifecycle: value })}
            />
            <FacetGroup
                legend="Timing"
                tiles={timingTiles}
                active={filters.timing}
                onSelect={(value) => onChange({ timing: value })}
            />
        </div>
    );
}

function FacetGroup<T extends string>({
    legend,
    tiles,
    active,
    onSelect,
}: {
    legend: string;
    tiles: Tile<T>[];
    active: T | null;
    onSelect: (value: T | null) => void;
}) {
    return (
        <fieldset className="flex flex-col gap-2">
            <legend className="mb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
                {legend}
            </legend>
            {/* Wraps rather than squeezing: a truncated count label defeats the point.
                The narrower phone track keeps two tiles per row at 375px. */}
            <div className="grid grid-cols-[repeat(auto-fit,minmax(7rem,1fr))] gap-2 sm:grid-cols-[repeat(auto-fit,minmax(8.5rem,1fr))]">
                {tiles.map(({ value, label, count, icon: Icon, iconClass }) => {
                    const isActive = active === value;
                    // An empty tile leads nowhere, so it stops being a target — unless it
                    // is the active one, which the user still needs to be able to undo.
                    const isDeadEnd = count === 0 && !isActive;

                    return (
                        <button
                            key={label}
                            type="button"
                            aria-pressed={isActive}
                            disabled={isDeadEnd}
                            onClick={() => onSelect(isActive ? null : value)}
                            className={cn(
                                'flex items-center gap-2 rounded-xl border bg-card px-2.5 py-2.5 text-left transition-colors sm:gap-3 sm:px-3',
                                'hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
                                isActive &&
                                    'border-primary bg-accent ring-1 ring-primary',
                                isDeadEnd && 'opacity-50 hover:bg-card',
                            )}
                        >
                            <span
                                className={cn(
                                    'flex size-8 shrink-0 items-center justify-center rounded-md sm:size-9',
                                    iconClass,
                                )}
                            >
                                <Icon className="size-4.5" />
                            </span>
                            <span className="min-w-0">
                                <span className="block text-xl leading-none font-semibold sm:text-2xl">
                                    {count}
                                </span>
                                <span className="mt-1 block truncate text-xs text-muted-foreground">
                                    {label}
                                </span>
                            </span>
                        </button>
                    );
                })}
            </div>
        </fieldset>
    );
}
