import { Link } from '@inertiajs/react';
import { ArrowRight, Calendar } from 'lucide-react';
import { formatRupiah } from '@/lib/format-currency';
import { formatDate } from '@/lib/format-date';
import { formatImageUrl } from '@/lib/image-utils';
import type { Event } from '@/types/event';

interface EventsSectionProps {
    events: Event[];
}

const STATUS_STYLE: Record<string, string> = {
    upcoming: 'bg-amber-400 text-amber-950',
    ongoing: 'bg-emerald-500 text-white',
    past: 'bg-neutral-400 text-neutral-950',
};

const UNAVAILABLE_LABEL: Record<string, string> = {
    closed: 'Closed',
    full: 'Sold out',
    ended: 'Event has ended',
};

export function EventsSection({ events }: EventsSectionProps) {
    return (
        <section id="events" className="mx-auto max-w-6xl px-6 py-14">
            <div className="mb-3 flex items-end justify-between">
                <div>
                    <span className="text-xs font-bold tracking-[0.3em] text-red-500 uppercase">
                        Live Now
                    </span>
                    <h2 className="text-3xl font-black tracking-tight uppercase">
                        Events &amp; Registration Fees
                    </h2>
                </div>
                <Link
                    href="/events"
                    className="text-xs font-semibold tracking-wide text-white/50 uppercase transition hover:text-white"
                >
                    View All Events
                </Link>
            </div>

            <p className="mb-8 max-w-2xl text-sm text-white/60">
                Every registration category we currently sell, with its price in
                Rupiah. Pick a category to open its registration form — paid
                entries are settled online through Midtrans right after you
                submit.
            </p>

            {events.length === 0 ? (
                <div className="rounded-2xl border-2 border-dashed border-white/20 p-12 text-center text-white/50">
                    No published events right now — check back soon.
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    {events.map((event) => {
                        const categories = event.registration_categories ?? [];

                        return (
                            <div
                                key={event.id}
                                className="group flex flex-col overflow-hidden rounded-2xl border-2 border-white/15 bg-white/5 transition hover:border-red-500"
                            >
                                <div className="relative aspect-video w-full overflow-hidden bg-gradient-to-br from-red-700 to-neutral-900">
                                    {event.banner && (
                                        <img
                                            src={formatImageUrl(event.banner)}
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

                                    {/* The price list itself. Each row is a thing you can buy and
                                        what it costs, linking straight to that category's form. */}
                                    {categories.length > 0 ? (
                                        <ul className="flex flex-col divide-y divide-white/10 border-y border-white/10">
                                            {categories.map((category) => {
                                                const row = (
                                                    <>
                                                        <span className="flex flex-col">
                                                            <span className="text-sm font-semibold text-white">
                                                                {category.name}
                                                            </span>
                                                            <span className="text-[11px] text-white/45">
                                                                {category.subject_type ===
                                                                'team'
                                                                    ? 'Per team'
                                                                    : 'Per person'}
                                                            </span>
                                                        </span>
                                                        <span className="flex shrink-0 items-center gap-1.5 text-sm font-bold text-white">
                                                            {formatRupiah(
                                                                category.price,
                                                            )}
                                                            <ArrowRight className="h-3.5 w-3.5 text-white/40" />
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
                                                                <span className="text-sm font-semibold text-white">
                                                                    {
                                                                        category.name
                                                                    }
                                                                </span>
                                                                <span className="text-[11px] text-white/45">
                                                                    {UNAVAILABLE_LABEL[
                                                                        category.unavailable_reason ??
                                                                            ''
                                                                    ] ??
                                                                        'Unavailable'}
                                                                </span>
                                                            </span>
                                                            <span className="shrink-0 text-sm font-bold text-white">
                                                                {formatRupiah(
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
                                                            className="flex items-center justify-between gap-3 py-2.5 transition hover:text-red-300"
                                                        >
                                                            {row}
                                                        </Link>
                                                    </li>
                                                );
                                            })}
                                        </ul>
                                    ) : (
                                        <p className="border-y border-white/10 py-2.5 text-xs text-white/45">
                                            Registration for this event is not
                                            open yet.
                                        </p>
                                    )}

                                    <Link
                                        href={`/events/${event.id}`}
                                        className="mt-auto flex items-center justify-center gap-2 rounded-full bg-red-600 py-2.5 text-sm font-bold tracking-wide text-white uppercase transition hover:bg-red-700"
                                    >
                                        View &amp; Register
                                        <ArrowRight className="h-4 w-4" />
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
