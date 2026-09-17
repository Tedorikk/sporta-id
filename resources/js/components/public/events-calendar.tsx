import { Link } from '@inertiajs/react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useT } from '@/hooks/use-t';
import { APP_LOCALE } from '@/lib/format-date';

interface CalendarEvent {
    id: number;
    name: string;
    slug: string;
    start_date: string;
    end_date: string;
}

interface Props {
    events: CalendarEvent[];
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function stripTime(date: Date) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function EventsCalendar({ events }: Props) {
    const { t } = useT();
    const [cursor, setCursor] = useState(() => {
        const now = new Date();

        return new Date(now.getFullYear(), now.getMonth(), 1);
    });

    const year = cursor.getFullYear();
    const month = cursor.getMonth();

    const grid = useMemo(() => {
        const firstOfMonth = new Date(year, month, 1);
        const startOffset = firstOfMonth.getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();

        const cells: { date: Date | null; events: CalendarEvent[] }[] = [];

        for (let i = 0; i < startOffset; i++) {
            cells.push({ date: null, events: [] });
        }

        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(year, month, day);
            const dayEvents = events.filter((event) => {
                const start = stripTime(new Date(event.start_date));
                const end = stripTime(new Date(event.end_date));

                return date >= start && date <= end;
            });
            cells.push({ date, events: dayEvents });
        }

        while (cells.length % 7 !== 0) {
            cells.push({ date: null, events: [] });
        }

        return cells;
    }, [events, year, month]);

    const monthLabel = cursor.toLocaleDateString(APP_LOCALE, {
        month: 'long',
        year: 'numeric',
    });
    const today = stripTime(new Date());

    return (
        <div className="border border-ink/12 p-6">
            <div className="mb-4 flex items-center justify-between">
                <h3 className="font-display text-lg font-bold">
                    {monthLabel}
                </h3>
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={() => setCursor(new Date(year, month - 1, 1))}
                        className="flex h-8 w-8 items-center justify-center border border-ink/15 text-ink/70 transition hover:border-poster-red hover:text-poster-red"
                    >
                        <ChevronLeft className="h-4 w-4" />
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            const now = new Date();
                            setCursor(
                                new Date(now.getFullYear(), now.getMonth(), 1),
                            );
                        }}
                        className="border border-ink/15 px-3 py-1 text-xs font-semibold tracking-wide text-ink/70 uppercase transition hover:border-poster-red hover:text-poster-red"
                    >
                        {t('Today')}
                    </button>
                    <button
                        type="button"
                        onClick={() => setCursor(new Date(year, month + 1, 1))}
                        className="flex h-8 w-8 items-center justify-center border border-ink/15 text-ink/70 transition hover:border-poster-red hover:text-poster-red"
                    >
                        <ChevronRight className="h-4 w-4" />
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-7 gap-px overflow-hidden border border-ink/10 bg-ink/10">
                {WEEKDAYS.map((day) => (
                    <div
                        key={day}
                        className="bg-ink/5 py-2 text-center text-[10px] font-semibold tracking-wide text-ink/40 uppercase"
                    >
                        {t(day)}
                    </div>
                ))}

                {grid.map((cell, i) => {
                    const isToday =
                        cell.date &&
                        stripTime(cell.date).getTime() === today.getTime();

                    return (
                        <div
                            key={i}
                            className={`min-h-20 bg-paper p-1.5 sm:min-h-24 ${isToday ? 'ring-2 ring-poster-red ring-inset' : ''}`}
                        >
                            {cell.date && (
                                <>
                                    <div
                                        className={`mb-1 text-xs font-semibold ${isToday ? 'text-poster-red' : 'text-ink/50'}`}
                                    >
                                        {cell.date.getDate()}
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        {cell.events
                                            .slice(0, 2)
                                            .map((event) => (
                                                <Link
                                                    key={event.id}
                                                    href={`/events/${event.slug}`}
                                                    className="block truncate bg-poster-red/10 px-1 py-0.5 text-[10px] font-medium text-poster-red transition hover:bg-poster-red/20"
                                                >
                                                    {event.name}
                                                </Link>
                                            ))}
                                        {cell.events.length > 2 && (
                                            <span className="text-[10px] text-ink/40">
                                                +{cell.events.length - 2} more
                                            </span>
                                        )}
                                    </div>
                                </>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
