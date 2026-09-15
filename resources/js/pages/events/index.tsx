import { Head, Link, router } from '@inertiajs/react';
import { Calendar, Search } from 'lucide-react';
import { useEffect, useState } from 'react';
import { IdToolsSection } from '@/components/landing/id-tools-section';
import { EventsCalendar } from '@/components/public/events-calendar';
import { PublicPageHeader } from '@/components/public/public-page-header';
import PublicLayout from '@/layouts/public-layout';
import { formatDate } from '@/lib/format-date';
import { formatImageUrl } from '@/lib/image-utils';
import type { EventFilters, PaginatedEvents } from '@/types/event';

interface CalendarEvent {
    id: number;
    name: string;
    start_date: string;
    end_date: string;
}

interface Props {
    events: PaginatedEvents;
    filters: EventFilters;
    categories: string[];
    calendarEvents: CalendarEvent[];
}

const STATUS_STYLE: Record<string, string> = {
    upcoming: 'bg-amber-400 text-amber-950',
    ongoing: 'bg-emerald-500 text-white',
    past: 'bg-neutral-400 text-neutral-950',
};

export default function EventsIndex({
    events,
    filters,
    categories,
    calendarEvents,
}: Props) {
    const [search, setSearch] = useState(filters.search ?? '');

    useEffect(() => {
        const timeout = setTimeout(() => {
            if (search === (filters.search ?? '')) {
                return;
            }

            updateQuery({ search: search || undefined });
        }, 350);

        return () => clearTimeout(timeout);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [search]);

    function updateQuery(partial: Record<string, string | undefined>) {
        router.get(
            '/events',
            { ...filters, ...partial },
            { preserveState: true, preserveScroll: true, replace: true },
        );
    }

    return (
        <>
            <Head title="Events — Sporta Indonesia" />

            <PublicLayout>
                <PublicPageHeader
                    eyebrow="Events"
                    title="All Events"
                    subtitle="Browse everything we've organized and register today."
                />

                <section className="mx-auto max-w-6xl px-6 py-14">
                    <div className="mb-10">
                        <EventsCalendar events={calendarEvents} />
                    </div>

                    <div className="mb-8 flex flex-wrap items-center gap-3">
                        <div className="relative w-full max-w-xs">
                            <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-white/40" />
                            <input
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Search events..."
                                className="w-full rounded-full border-2 border-white/15 bg-white/5 py-2 pr-4 pl-9 text-sm text-white placeholder:text-white/40 focus:border-red-500 focus:outline-none"
                            />
                        </div>

                        <select
                            value={filters.category ?? ''}
                            onChange={(e) =>
                                updateQuery({
                                    category: e.target.value || undefined,
                                })
                            }
                            className="rounded-full border-2 border-white/15 bg-white/5 px-4 py-2 text-sm text-white focus:border-red-500 focus:outline-none"
                        >
                            <option value="" className="bg-neutral-900">
                                All categories
                            </option>
                            {categories.map((category) => (
                                <option
                                    key={category}
                                    value={category}
                                    className="bg-neutral-900"
                                >
                                    {category}
                                </option>
                            ))}
                        </select>
                    </div>

                    {events.data.length === 0 ? (
                        <div className="rounded-2xl border-2 border-dashed border-white/20 p-12 text-center text-white/50">
                            No events match your search.
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                            {events.data.map((event) => {
                                return (
                                    <Link
                                        key={event.id}
                                        href={`/events/${event.id}`}
                                        className="group flex flex-col overflow-hidden rounded-2xl border-2 border-white/15 bg-white/5 transition hover:border-red-500"
                                    >
                                        <div className="relative aspect-4/5 w-full overflow-hidden bg-gradient-to-br from-red-700 to-neutral-900">
                                            {event.banner && (
                                                <img
                                                    src={formatImageUrl(
                                                        event.banner,
                                                    )}
                                                    alt={event.name}
                                                    className="h-full w-full object-cover opacity-80 transition group-hover:opacity-100"
                                                />
                                            )}
                                            <span
                                                className={`absolute top-3 left-3 rounded-full px-3 py-0.5 text-[10px] font-bold tracking-wide uppercase ${STATUS_STYLE[event.status] ?? 'bg-white text-black'}`}
                                            >
                                                {event.status}
                                            </span>
                                        </div>
                                        <div className="flex flex-1 flex-col gap-3 p-5">
                                            <h3 className="text-lg font-bold tracking-tight">
                                                {event.name}
                                            </h3>
                                            <div className="flex items-center gap-1.5 text-xs text-white/60">
                                                <Calendar className="h-3.5 w-3.5" />
                                                {formatDate(event.start_date)} –{' '}
                                                {formatDate(event.end_date)}
                                            </div>
                                        </div>
                                    </Link>
                                );
                            })}
                        </div>
                    )}

                    {events.last_page > 1 && (
                        <nav className="mt-10 flex flex-wrap items-center justify-center gap-2">
                            {events.links.map((link, i) => (
                                <button
                                    key={i}
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
                                    className={`rounded-full border-2 px-4 py-1.5 text-sm font-semibold tracking-wide uppercase transition ${
                                        link.active
                                            ? 'border-red-500 bg-red-600 text-white'
                                            : link.url
                                              ? 'border-white/15 text-white/70 hover:border-white/40'
                                              : 'cursor-not-allowed border-white/10 text-white/20'
                                    }`}
                                />
                            ))}
                        </nav>
                    )}
                </section>

                <IdToolsSection />
            </PublicLayout>
        </>
    );
}
