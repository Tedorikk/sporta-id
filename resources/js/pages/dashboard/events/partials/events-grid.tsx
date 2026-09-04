import { Link } from '@inertiajs/react';
import { CalendarDays, PanelRightOpen, Tag, Users } from 'lucide-react';
import { EventBanner } from '@/components/event-banner';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { APP_LOCALE } from '@/lib/format-date';
import { cn } from '@/lib/utils';
import type { Event } from '@/types/event';
import { EventLifecycleBadge, EventTimingBadge } from './event-badges';

interface Props {
    events: Event[];
    onPeek: (event: Event) => void;
    onTogglePublication: (event: Event, published: boolean) => void;
    pendingIds: number[];
}

const UTC: Intl.DateTimeFormatOptions = { timeZone: 'UTC' };

function part(date: Date, opts: Intl.DateTimeFormatOptions) {
    return date.toLocaleDateString(APP_LOCALE, { ...UTC, ...opts });
}

/**
 * Collapses what the two ends share — "10 – 24 Agu 2026" rather than
 * "10 Agu 2026 – 24 Agu 2026" — so the range still fits a narrow card.
 */
function formatDateRange(start: string, end: string) {
    const s = new Date(start);
    const e = new Date(end);
    const full: Intl.DateTimeFormatOptions = {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
    };

    if (start === end) {
        return part(s, full);
    }

    const sameYear = s.getUTCFullYear() === e.getUTCFullYear();
    const sameMonth = sameYear && s.getUTCMonth() === e.getUTCMonth();

    if (sameMonth) {
        return `${part(s, { day: 'numeric' })} – ${part(e, full)}`;
    }

    if (sameYear) {
        return `${part(s, { day: 'numeric', month: 'short' })} – ${part(e, full)}`;
    }

    return `${part(s, full)} – ${part(e, full)}`;
}

export function EventsGrid({
    events,
    onPeek,
    onTogglePublication,
    pendingIds,
}: Props) {
    return (
        <section
            id="index"
            className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3"
        >
            {events.map((event) => (
                <Card
                    key={event.id}
                    // h-full + the fixed-height sections below keep every card the
                    // same height, so the footer controls line up across the row.
                    className="group relative flex h-full flex-col overflow-hidden pt-0 transition-shadow duration-200 focus-within:ring-2 focus-within:ring-ring hover:shadow-lg"
                >
                    <div className="relative aspect-4/5 w-full shrink-0 overflow-hidden bg-muted">
                        <EventBanner
                            banner={event.banner}
                            className="transition-transform duration-300 group-hover:scale-[1.03]"
                        />

                        {event.banner && (
                            <div
                                aria-hidden="true"
                                className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-black/25"
                            />
                        )}

                        <div className="absolute top-3 left-3 flex flex-wrap gap-2">
                            <EventTimingBadge status={event.status} />
                            {!event.is_published && (
                                <EventLifecycleBadge published={false} />
                            )}
                        </div>

                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    variant="secondary"
                                    size="icon"
                                    data-peek-trigger
                                    onClick={() => onPeek(event)}
                                    className="absolute top-3 right-3 size-8 opacity-0 shadow-sm transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
                                >
                                    <PanelRightOpen className="size-4" />
                                    <span className="sr-only">
                                        Quick view {event.name}
                                    </span>
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>Quick view</TooltipContent>
                        </Tooltip>
                    </div>

                    <CardHeader className="gap-1.5">
                        <CardTitle className="line-clamp-1">
                            <Link
                                href={`/dashboard/events/${event.id}`}
                                className="rounded-sm outline-none hover:underline focus-visible:underline"
                            >
                                {event.name}
                            </Link>
                        </CardTitle>
                        {/* Two lines are reserved whether or not there is a description. */}
                        <CardDescription className="line-clamp-2 min-h-10">
                            {event.description || 'No description provided.'}
                        </CardDescription>
                    </CardHeader>

                    <CardContent className="flex flex-col gap-2 text-sm">
                        <div className="flex items-center gap-2 text-muted-foreground">
                            <CalendarDays className="size-4 shrink-0" />
                            <span className="truncate">
                                {formatDateRange(
                                    event.start_date,
                                    event.end_date,
                                )}
                            </span>
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground">
                            <Tag className="size-4 shrink-0" />
                            <span className="truncate">
                                {event.category ?? 'Uncategorised'}
                            </span>
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground">
                            <Users className="size-4 shrink-0" />
                            <span className="truncate">
                                {event.attendees_count ?? 0} attendees
                            </span>
                        </div>
                    </CardContent>

                    {/* mt-auto pins the footer to the bottom of every card, so the
                        controls sit at the same height regardless of text length. */}
                    <CardFooter className="mt-auto flex flex-col items-stretch gap-3 border-t pt-4">
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

                        <Button size="sm" className="w-full" asChild>
                            <Link href={`/dashboard/events/${event.id}`}>
                                View event
                            </Link>
                        </Button>
                    </CardFooter>
                </Card>
            ))}
        </section>
    );
}
