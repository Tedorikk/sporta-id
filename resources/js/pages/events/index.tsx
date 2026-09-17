import { Head, Link, router } from '@inertiajs/react';
import { Calendar, Search } from 'lucide-react';
import { useEffect, useState } from 'react';
import { IdToolsSection } from '@/components/landing/id-tools-section';
import { EventsCalendar } from '@/components/public/events-calendar';
import { MarketingPageHeader } from '@/components/public/marketing-page-header';
import { useT } from '@/hooks/use-t';
import PublicLayout from '@/layouts/public-layout';
import { formatDate } from '@/lib/format-date';
import { formatImageUrl } from '@/lib/image-utils';
import type { EventFilters, PaginatedEvents } from '@/types/event';
import { EVENT_STATUS_LABEL } from '@/types/event';

interface CalendarEvent {
    id: number;
    name: string;
    slug: string;
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
    upcoming: 'bg-poster-yellow text-ink',
    ongoing: 'bg-poster-red text-paper',
    past: 'bg-ink/60 text-paper/70',
};

export default function EventsIndex({
    events,
    filters,
    categories,
    calendarEvents,
}: Props) {
    const { t } = useT();
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
            <Head title={t('Events — Sporta Indonesia')} />

            <PublicLayout>
                <MarketingPageHeader
                    eyebrow={t('Events')}
                    title={t('All Events')}
                    subtitle={t(
                        'Browse everything we’ve organized and register today.',
                    )}
                />

                <section className="mx-auto max-w-6xl px-6 py-14">
                    <div className="mb-10">
                        <EventsCalendar events={calendarEvents} />
                    </div>

                    <div className="mb-8 flex flex-wrap items-center gap-3">
                        <div className="relative w-full max-w-xs">
                            <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-ink/40" />
                            <input
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder={t('Search events…')}
                                className="w-full border border-ink/15 py-2 pr-4 pl-9 text-sm text-ink placeholder:text-ink/40 focus:border-poster-red focus:outline-none"
                            />
                        </div>

                        <select
                            value={filters.category ?? ''}
                            onChange={(e) =>
                                updateQuery({
                                    category: e.target.value || undefined,
                                })
                            }
                            className="border border-ink/15 bg-paper px-4 py-2 text-sm text-ink focus:border-poster-red focus:outline-none"
                        >
                            <option value="">{t('All categories')}</option>
                            {categories.map((category) => (
                                <option key={category} value={category}>
                                    {category}
                                </option>
                            ))}
                        </select>
                    </div>

                    {events.data.length === 0 ? (
                        <div className="border border-dashed border-ink/20 p-12 text-center text-ink/50">
                            {t('No events match your search.')}
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                            {events.data.map((event) => {
                                return (
                                    <Link
                                        key={event.id}
                                        href={`/events/${event.slug}`}
                                        className="group flex flex-col overflow-hidden border border-ink/12 transition hover:border-poster-red"
                                    >
                                        <div className="relative aspect-4/5 w-full overflow-hidden bg-ink">
                                            {event.banner && (
                                                <img
                                                    src={formatImageUrl(
                                                        event.banner,
                                                    )}
                                                    alt={event.name}
                                                    className="h-full w-full object-cover"
                                                />
                                            )}
                                            <span
                                                className={`absolute top-0 left-0 px-3 py-1 text-xs font-semibold uppercase ${STATUS_STYLE[event.status] ?? 'bg-paper text-ink'}`}
                                            >
                                                {t(
                                                    EVENT_STATUS_LABEL[
                                                        event.status
                                                    ] ?? event.status,
                                                )}
                                            </span>
                                        </div>
                                        <div className="flex flex-1 flex-col gap-3 p-5">
                                            <h3 className="font-display text-lg font-bold">
                                                {event.name}
                                            </h3>
                                            <div className="flex items-center gap-1.5 text-xs text-ink/60">
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
                                    className={`border px-4 py-1.5 text-sm font-semibold tracking-wide uppercase transition ${
                                        link.active
                                            ? 'border-poster-red bg-poster-red text-paper'
                                            : link.url
                                              ? 'border-ink/15 text-ink/70 hover:border-ink/40'
                                              : 'cursor-not-allowed border-ink/10 text-ink/20'
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
