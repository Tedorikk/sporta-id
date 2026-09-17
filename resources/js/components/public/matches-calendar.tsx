import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useT } from '@/hooks/use-t';
import { APP_LOCALE } from '@/lib/format-date';
import type { GameMatch } from '@/types/game-match';
import { MatchRow } from './match-row';

export interface CalendarMatch {
    match: GameMatch;
    categoryName: string;
}

interface Props {
    matches: CalendarMatch[];
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function stripTime(date: Date) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function dateKey(date: Date) {
    return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

export function MatchesCalendar({ matches }: Props) {
    const { t } = useT();
    const scheduledMatches = useMemo(
        () =>
            matches
                .filter(
                    (
                        item,
                    ): item is CalendarMatch & {
                        match: GameMatch & { scheduled_at: string };
                    } => Boolean(item.match.scheduled_at),
                )
                .sort(
                    (a, b) =>
                        new Date(a.match.scheduled_at).getTime() -
                        new Date(b.match.scheduled_at).getTime(),
                ),
        [matches],
    );
    const unscheduledMatches = useMemo(
        () => matches.filter((item) => !item.match.scheduled_at),
        [matches],
    );

    const [cursor, setCursor] = useState(() => {
        const first = scheduledMatches[0];
        const base = first ? new Date(first.match.scheduled_at) : new Date();

        return new Date(base.getFullYear(), base.getMonth(), 1);
    });
    const [selectedKey, setSelectedKey] = useState<string | null>(null);

    const year = cursor.getFullYear();
    const month = cursor.getMonth();

    const matchesByDay = useMemo(() => {
        const map = new Map<string, CalendarMatch[]>();

        for (const item of scheduledMatches) {
            const key = dateKey(new Date(item.match.scheduled_at as string));
            const list = map.get(key) ?? [];
            list.push(item);
            map.set(key, list);
        }

        return map;
    }, [scheduledMatches]);

    const grid = useMemo(() => {
        const firstOfMonth = new Date(year, month, 1);
        const startOffset = firstOfMonth.getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();

        const cells: { date: Date | null; matches: CalendarMatch[] }[] = [];

        for (let i = 0; i < startOffset; i++) {
            cells.push({ date: null, matches: [] });
        }

        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(year, month, day);
            cells.push({
                date,
                matches: matchesByDay.get(dateKey(date)) ?? [],
            });
        }

        while (cells.length % 7 !== 0) {
            cells.push({ date: null, matches: [] });
        }

        return cells;
    }, [matchesByDay, year, month]);

    if (matches.length === 0) {
        return null;
    }

    const monthLabel = cursor.toLocaleDateString(APP_LOCALE, {
        month: 'long',
        year: 'numeric',
    });
    const today = stripTime(new Date());
    const selectedMatches = selectedKey
        ? (matchesByDay.get(selectedKey) ?? [])
        : [];

    return (
        <div className="flex flex-col gap-3">
            {scheduledMatches.length > 0 && (
                <div className="rounded-xl border-2 border-ink/12 p-4">
                    <div className="mb-3 flex items-center justify-between">
                        <span className="text-sm font-bold tracking-wide text-ink/80 uppercase">
                            {monthLabel}
                        </span>
                        <div className="flex items-center gap-1.5">
                            <button
                                type="button"
                                onClick={() =>
                                    setCursor(new Date(year, month - 1, 1))
                                }
                                className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-ink/15 text-ink/70 transition hover:border-poster-red hover:text-ink"
                                aria-label={t('Previous month')}
                            >
                                <ChevronLeft className="h-3.5 w-3.5" />
                            </button>
                            <button
                                type="button"
                                onClick={() =>
                                    setCursor(new Date(year, month + 1, 1))
                                }
                                className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-ink/15 text-ink/70 transition hover:border-poster-red hover:text-ink"
                                aria-label={t('Next month')}
                            >
                                <ChevronRight className="h-3.5 w-3.5" />
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-7 gap-px overflow-hidden rounded-lg border border-ink/10 bg-ink/10">
                        {WEEKDAYS.map((day) => (
                            <div
                                key={day}
                                className="bg-ink/5 py-1.5 text-center text-[10px] font-bold tracking-wide text-ink/40 uppercase"
                            >
                                {t(day)}
                            </div>
                        ))}

                        {grid.map((cell, i) => {
                            const isToday =
                                cell.date &&
                                stripTime(cell.date).getTime() ===
                                    today.getTime();
                            const key = cell.date ? dateKey(cell.date) : null;
                            const isSelected =
                                key !== null && key === selectedKey;
                            const hasMatches = cell.matches.length > 0;

                            return (
                                <button
                                    type="button"
                                    key={i}
                                    disabled={!hasMatches}
                                    onClick={() =>
                                        key &&
                                        setSelectedKey(isSelected ? null : key)
                                    }
                                    className={`min-h-14 bg-paper p-1 text-left sm:min-h-16 ${isToday ? 'ring-2 ring-red-500 ring-inset' : ''} ${
                                        isSelected ? 'bg-poster-red/20' : ''
                                    } ${hasMatches ? 'cursor-pointer hover:bg-ink/5' : 'cursor-default'}`}
                                >
                                    {cell.date && (
                                        <>
                                            <div
                                                className={`text-xs font-semibold ${isToday ? 'text-poster-red' : 'text-ink/50'}`}
                                            >
                                                {cell.date.getDate()}
                                            </div>
                                            {hasMatches && (
                                                <div className="mt-1 flex items-center gap-1">
                                                    <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                                                    <span className="text-[10px] text-ink/50">
                                                        {cell.matches.length}
                                                    </span>
                                                </div>
                                            )}
                                        </>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}

            {selectedMatches.length > 0 && (
                <div className="flex flex-col gap-2">
                    {selectedMatches.map((item) => (
                        <MatchRow
                            key={item.match.id}
                            match={item.match}
                            categoryLabel={item.categoryName}
                        />
                    ))}
                </div>
            )}

            {unscheduledMatches.length > 0 && (
                <div className="flex flex-col gap-2">
                    {scheduledMatches.length > 0 && (
                        <span className="text-xs font-semibold tracking-wide text-ink/40 uppercase">
                            {t('Not yet scheduled')}
                        </span>
                    )}
                    {unscheduledMatches.map((item) => (
                        <MatchRow
                            key={item.match.id}
                            match={item.match}
                            categoryLabel={item.categoryName}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
