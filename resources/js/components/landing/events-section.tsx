import { Link } from '@inertiajs/react';
import { ArrowRight, Calendar } from 'lucide-react';
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

export function EventsSection({ events }: EventsSectionProps) {
    return (
        <section id="events" className="mx-auto max-w-6xl px-6 py-14">
            <div className="mb-8 flex items-end justify-between">
                <div>
                    <span className="text-xs font-bold tracking-[0.3em] text-red-500 uppercase">Live Now</span>
                    <h2 className="text-3xl font-black tracking-tight uppercase">Upcoming Events</h2>
                </div>
                <Link
                    href="/events"
                    className="text-xs font-semibold tracking-wide text-white/50 uppercase transition hover:text-white"
                >
                    View All Events
                </Link>
            </div>

            {events.length === 0 ? (
                <div className="rounded-2xl border-2 border-dashed border-white/20 p-12 text-center text-white/50">
                    No published events right now — check back soon.
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    {events.map((event) => (
                        <div
                            key={event.id}
                            className="group flex flex-col overflow-hidden rounded-2xl border-2 border-white/15 bg-white/5 transition hover:border-red-500"
                        >
                            <div className="relative aspect-4/5 w-full overflow-hidden bg-gradient-to-br from-red-700 to-neutral-900">
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
                                <h3 className="text-lg font-bold tracking-tight">{event.name}</h3>
                                <div className="flex items-center gap-1.5 text-xs text-white/60">
                                    <Calendar className="h-3.5 w-3.5" />
                                    {formatDate(event.start_date)} – {formatDate(event.end_date)}
                                </div>
                                <Link
                                    href={`/events/${event.id}/register`}
                                    className="mt-auto flex items-center justify-center gap-2 rounded-full bg-red-600 py-2.5 text-sm font-bold tracking-wide text-white uppercase transition hover:bg-red-700"
                                >
                                    Register Now
                                    <ArrowRight className="h-4 w-4" />
                                </Link>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </section>
    );
}
