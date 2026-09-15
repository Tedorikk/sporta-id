import { Link } from '@inertiajs/react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useT } from '@/hooks/use-t';
import { APP_LOCALE } from '@/lib/format-date';

interface CalendarEvent {
    id: number;
    name: string;
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
        <div className="rounded-2xl border-2 border-white/15 bg-white/5 p-6">
            <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-black tracking-tight uppercase">
                    {monthLabel}
                </h3>
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={() => setCursor(new Date(year, month - 1, 1))}
                        className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white/15 text-white/70 transition hover:border-red-500 hover:text-white"
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
                        className="rounded-full border-2 border-white/15 px-3 py-1 text-xs font-bold tracking-wide text-white/70 uppercase transition hover:border-red-500 hover:text-white"
                    >
                        {t('Today')}
                    </button>
                    <button
                        type="button"
                        onClick={() => setCursor(new Date(year, month + 1, 1))}
                        className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white/15 text-white/70 transition hover:border-red-500 hover:text-white"
                    >
                        <ChevronRight className="h-4 w-4" />
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-7 gap-px overflow-hidden rounded-xl border-2 border-white/10 bg-white/10">
                {WEEKDAYS.map((day) => (
                    <div
                        key={day}
                        className="bg-black/40 py-2 text-center text-[10px] font-bold tracking-wide text-white/40 uppercase"
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
                            className={`min-h-20 bg-neutral-950 p-1.5 sm:min-h-24 ${isToday ? 'ring-2 ring-red-500 ring-inset' : ''}`}
                        >
                            {cell.date && (
                                <>
                                    <div
                                        className={`mb-1 text-xs font-semibold ${isToday ? 'text-red-400' : 'text-white/50'}`}
                                    >
                                        {cell.date.getDate()}
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        {cell.events
                                            .slice(0, 2)
                                            .map((event) => (
                                                <Link
                                                    key={event.id}
                                                    href={`/events/${event.id}`}
                                                    className="block truncate rounded bg-red-600/20 px-1 py-0.5 text-[10px] font-medium text-red-300 transition hover:bg-red-600/40"
                                                >
                                                    {event.name}
                                                </Link>
                                            ))}
                                        {cell.events.length > 2 && (
                                            <span className="text-[10px] text-white/40">
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
