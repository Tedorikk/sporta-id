import { router, Link } from '@inertiajs/react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    HoverCard,
    HoverCardContent,
    HoverCardTrigger,
} from '@/components/ui/hover-card';
import events from '@/routes/events';
import type { Event, EventFilters } from '@/types/event';

interface Props {
    events: Event[];
    month: string; // "YYYY-MM"
    filters: EventFilters;
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function shiftMonth(month: string, delta: number) {
    const [y, m] = month.split('-').map(Number);
    const d = new Date(y, m - 1 + delta, 1);

    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export default function EventsCalendar({
    events: list,
    month,
    filters,
}: Props) {
    const [year, monthNum] = month.split('-').map(Number);

    const grid = useMemo(() => {
        const firstOfMonth = new Date(year, monthNum - 1, 1);
        const startOffset = firstOfMonth.getDay();
        const daysInMonth = new Date(year, monthNum, 0).getDate();

        const cells: { date: Date | null; events: Event[] }[] = [];

        for (let i = 0; i < startOffset; i++) {
            cells.push({ date: null, events: [] });
        }

        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(year, monthNum - 1, day);
            const dayEvents = list.filter((e) => {
                const start = new Date(e.start_date);
                const end = new Date(e.end_date);

                return date >= stripTime(start) && date <= stripTime(end);
            });
            cells.push({ date, events: dayEvents });
        }

        while (cells.length % 7 !== 0) {
            cells.push({ date: null, events: [] });
        }

        return cells;
    }, [list, year, monthNum]);

    function stripTime(d: Date) {
        return new Date(d.getFullYear(), d.getMonth(), d.getDate());
    }

    function goTo(newMonth: string) {
        router.get(
            events.index().url,
            { ...filters, view: 'calendar', month: newMonth },
            { preserveState: true },
        );
    }

    const monthLabel = new Date(year, monthNum - 1, 1).toLocaleDateString(
        undefined,
        {
            month: 'long',
            year: 'numeric',
        },
    );

    const today = stripTime(new Date());

    return (
        <section id="calendar" className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">{monthLabel}</h2>
                <div className="flex items-center gap-1">
                    <Button
                        variant="outline"
                        size="icon"
                        onClick={() => goTo(shiftMonth(month, -1))}
                        className="h-10"
                    >
                        <ChevronLeft className="size-4" />
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => goTo(currentMonthStr())}
                        className="h-10"
                    >
                        Today
                    </Button>
                    <Button
                        variant="outline"
                        size="icon"
                        onClick={() => goTo(shiftMonth(month, 1))}
                        className="h-10"
                    >
                        <ChevronRight className="size-4" />
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-7 overflow-hidden rounded-lg border">
                {WEEKDAYS.map((d) => (
                    <div
                        key={d}
                        className="border-b bg-muted p-2 text-center text-xs font-medium text-muted-foreground"
                    >
                        {d}
                    </div>
                ))}

                {grid.map((cell, i) => {
                    const isToday =
                        cell.date &&
                        stripTime(cell.date).getTime() === today.getTime();

                    return (
                        <div
                            key={i}
                            className={`min-h-27.5 border-r border-b p-1.5 last:border-r-0 nth-[7n]:border-r-0 ${
                                isToday
                                    ? 'bg-primary/10 ring-1 ring-primary ring-inset'
                                    : ''
                            }`}
                        >
                            {cell.date && (
                                <>
                                    <div
                                        className={`mb-1 text-xs font-medium ${
                                            isToday
                                                ? 'inline-flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground'
                                                : 'text-muted-foreground'
                                        }`}
                                    >
                                        {cell.date.getDate()}
                                    </div>

                                    <div className="flex flex-col gap-1">
                                        {cell.events.slice(0, 3).map((e) => (
                                            <HoverCard
                                                key={e.id}
                                                openDelay={150}
                                                closeDelay={100}
                                            >
                                                <HoverCardTrigger asChild>
                                                    <Link
                                                        href={`/dashboard/events/${e.id}`}
                                                        className="block truncate rounded bg-blue-100 px-1.5 py-0.5 text-[11px] text-blue-800 hover:bg-blue-200 dark:bg-blue-900/40 dark:text-blue-200 hover:dark:bg-blue-800/40"
                                                    >
                                                        {e.name}
                                                    </Link>
                                                </HoverCardTrigger>
                                                <HoverCardContent
                                                    side="top"
                                                    align="start"
                                                    className="w-72 shadow-xl"
                                                >
                                                    <div className="flex flex-col gap-2">
                                                        <div>
                                                            <h4 className="text-sm font-semibold text-foreground">
                                                                {e.name}
                                                            </h4>
                                                            <p className="mt-0.5 text-[10px] text-muted-foreground">
                                                                {new Date(
                                                                    e.start_date,
                                                                ).toLocaleDateString()}{' '}
                                                                –{' '}
                                                                {new Date(
                                                                    e.end_date,
                                                                ).toLocaleDateString()}
                                                            </p>
                                                        </div>

                                                        <div className="flex flex-wrap gap-1.5">
                                                            <Badge
                                                                variant={
                                                                    e.status ===
                                                                    'ongoing'
                                                                        ? 'default'
                                                                        : 'secondary'
                                                                }
                                                                className="text-[10px] capitalize"
                                                            >
                                                                {e.status}
                                                            </Badge>
                                                            <Badge
                                                                variant="outline"
                                                                className="text-[10px]"
                                                            >
                                                                {e.category}
                                                            </Badge>
                                                            {!e.is_published && (
                                                                <Badge
                                                                    variant="destructive"
                                                                    className="text-[10px]"
                                                                >
                                                                    Draft
                                                                </Badge>
                                                            )}
                                                        </div>

                                                        {e.description && (
                                                            <p className="line-clamp-3 text-xs text-muted-foreground">
                                                                {e.description}
                                                            </p>
                                                        )}

                                                        <div className="mt-1 border-t pt-2 text-[11px] text-muted-foreground">
                                                            <span className="font-medium text-foreground">
                                                                Contact:{' '}
                                                            </span>
                                                            {e.contact_person}
                                                        </div>
                                                    </div>
                                                </HoverCardContent>
                                            </HoverCard>
                                        ))}

                                        {cell.events.length > 3 && (
                                            <Badge
                                                variant="outline"
                                                className="w-fit text-[10px]"
                                            >
                                                +{cell.events.length - 3} more
                                            </Badge>
                                        )}
                                    </div>
                                </>
                            )}
                        </div>
                    );
                })}
            </div>
        </section>
    );
}

function currentMonthStr() {
    const d = new Date();

    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}
