import { Link } from '@inertiajs/react';
import { Calendar } from 'lucide-react';
import { useT } from '@/hooks/use-t';
import { formatPublicPrice } from '@/lib/format-currency';
import { formatDate } from '@/lib/format-date';
import { formatImageUrl } from '@/lib/image-utils';
import type { Event } from '@/types/event';
import { EVENT_STATUS_LABEL } from '@/types/event';

interface EventsSectionProps {
    events: Event[];
}

const STATUS_STYLE: Record<string, string> = {
    upcoming: 'bg-poster-yellow text-ink',
    ongoing: 'bg-poster-red text-paper',
    past: 'bg-ink/60 text-paper/70',
};

const UNAVAILABLE_LABEL: Record<string, string> = {
    closed: 'Closed',
    full: 'Sold out',
    ended: 'Event has ended',
};

export function EventsSection({ events }: EventsSectionProps) {
    const { t } = useT();

    return (
        <section
            id="events"
            className="mx-auto max-w-6xl px-6 py-14"
        >
            <div className="mb-3 flex items-end justify-between border-t border-ink/10 pt-8">
                <h2 className="font-display text-3xl font-bold">
                    {t('Events & registration fees')}
                </h2>
                <Link
                    href="/events"
                    className="text-xs font-semibold tracking-widest text-ink/50 uppercase transition hover:text-poster-red"
                >
                    {t('View All Events')}
                </Link>
            </div>

            <p className="mb-8 max-w-2xl text-ink/60">
                {t(
                    'Every registration category we currently sell, with its price in Rupiah. Pick a category to open its registration form — paid entries are settled online through Midtrans right after you submit.',
                )}
            </p>

            {events.length === 0 ? (
                <div className="border border-dashed border-ink/20 p-12 text-center text-ink/50">
                    {t('No published events right now — check back soon.')}
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                    {events.map((event) => {
                        const categories = event.registration_categories ?? [];

                        return (
                            <div
                                key={event.id}
                                className="flex flex-col border border-ink/12 text-ink"
                            >
                                <div className="relative aspect-video w-full overflow-hidden bg-ink">
                                    {event.banner && (
                                        <img
                                            src={formatImageUrl(event.banner)}
                                            alt={event.name}
                                            className="h-full w-full object-cover"
                                        />
                                    )}
                                    <span
                                        className={`absolute top-0 left-0 px-3 py-1 text-xs font-semibold uppercase ${STATUS_STYLE[event.status] ?? 'bg-paper text-ink'}`}
                                    >
                                        {t(
                                            EVENT_STATUS_LABEL[event.status] ??
                                                event.status,
                                        )}
                                    </span>
                                </div>

                                <div className="flex flex-1 flex-col gap-3 p-5">
                                    <h3 className="font-display text-xl font-bold">
                                        {event.name}
                                    </h3>
                                    <div className="flex items-center gap-1.5 text-xs text-ink/60">
                                        <Calendar className="h-3.5 w-3.5" />
                                        {formatDate(event.start_date)} –{' '}
                                        {formatDate(event.end_date)}
                                    </div>

                                    {/* The price list itself. Each row is a thing you can buy and
                                        what it costs, linking straight to that category's form. */}
                                    {categories.length > 0 ? (
                                        <ul className="flex flex-col divide-y divide-ink/10 border-y border-ink/10">
                                            {categories.map((category) => {
                                                const row = (
                                                    <>
                                                        <span className="flex flex-col">
                                                            <span className="text-sm font-semibold text-ink">
                                                                {category.name}
                                                            </span>
                                                            <span className="text-[11px] text-ink/50">
                                                                {category.subject_type ===
                                                                'team'
                                                                    ? t(
                                                                          'Per team',
                                                                      )
                                                                    : t(
                                                                          'Per person',
                                                                      )}
                                                            </span>
                                                        </span>
                                                        <span className="font-display shrink-0 text-sm font-semibold text-ink">
                                                            {formatPublicPrice(
                                                                category.price,
                                                            )}
                                                        </span>
                                                    </>
                                                );

                                                if (!category.is_available) {
                                                    return (
                                                        <li
                                                            key={category.id}
                                                            className="flex items-center justify-between gap-3 py-2.5 opacity-50"
                                                        >
                                                            <span className="flex flex-col">
                                                                <span className="text-sm font-semibold text-ink">
                                                                    {
                                                                        category.name
                                                                    }
                                                                </span>
                                                                <span className="text-[11px] text-ink/50">
                                                                    {t(
                                                                        UNAVAILABLE_LABEL[
                                                                            category.unavailable_reason ??
                                                                                ''
                                                                        ] ??
                                                                            'Unavailable',
                                                                    )}
                                                                </span>
                                                            </span>
                                                            <span className="font-display shrink-0 text-sm font-semibold text-ink">
                                                                {formatPublicPrice(
                                                                    category.price,
                                                                )}
                                                            </span>
                                                        </li>
                                                    );
                                                }

                                                return (
                                                    <li key={category.id}>
                                                        <Link
                                                            href={`/events/${event.id}/registration-categories/${category.id}/register`}
                                                            className="flex items-center justify-between gap-3 py-2.5 transition hover:bg-poster-red/5"
                                                        >
                                                            {row}
                                                        </Link>
                                                    </li>
                                                );
                                            })}
                                        </ul>
                                    ) : (
                                        <p className="border-y border-ink/10 py-2.5 text-xs text-ink/50">
                                            {t(
                                                'Registration for this event is not open yet.',
                                            )}
                                        </p>
                                    )}

                                    <Link
                                        href={`/registration/${event.slug}`}
                                        className="mt-auto flex items-center justify-center bg-poster-red py-2.5 text-sm font-semibold tracking-wide text-paper uppercase transition hover:bg-ink"
                                    >
                                        {t('View & Register')}
                                    </Link>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </section>
    );
}
