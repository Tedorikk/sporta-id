import { Head, Link } from '@inertiajs/react';
import { ArrowRight, Calendar } from 'lucide-react';
import { BasketballCategorySection } from '@/components/public/basketball-category-section';
import PublicLayout from '@/layouts/public-layout';
import { formatDate } from '@/lib/format-date';
import { formatImageUrl } from '@/lib/image-utils';
import type { Event } from '@/types/event';
import type { PublicEventCategory } from '@/types/public-event-category';

interface Props {
    event: Event;
    categories: PublicEventCategory[] | null;
}

const STATUS_STYLE: Record<string, string> = {
    upcoming: 'bg-amber-400 text-amber-950',
    ongoing: 'bg-emerald-500 text-white',
    past: 'bg-neutral-400 text-neutral-950',
};

export default function EventShow({ event, categories }: Props) {
    return (
        <>
            <Head title={`${event.name} — Sporta Indonesia`} />

            <PublicLayout>
                <section className="relative overflow-hidden bg-gradient-to-br from-red-700 via-red-800 to-neutral-950">
                    {event.banner && (
                        <img
                            src={formatImageUrl(event.banner)}
                            alt={event.name}
                            className="absolute inset-0 h-full w-full object-cover opacity-30"
                        />
                    )}
                    <div className="relative mx-auto flex max-w-5xl flex-col gap-4 px-6 py-20">
                        <span
                            className={`w-fit rounded-full px-3 py-1 text-xs font-bold tracking-wide uppercase ${STATUS_STYLE[event.status] ?? 'bg-white text-black'}`}
                        >
                            {event.status}
                        </span>
                        <h1 className="text-4xl leading-[1.05] font-black tracking-tight uppercase sm:text-5xl">
                            {event.name}
                        </h1>
                        <div className="flex items-center gap-2 text-white/80">
                            <Calendar className="h-4 w-4" />
                            {formatDate(event.start_date)} – {formatDate(event.end_date)}
                        </div>
                    </div>
                </section>

                <section className="mx-auto max-w-5xl px-6 py-14">
                    {event.description && <p className="whitespace-pre-line text-white/80">{event.description}</p>}

                    <Link
                        href={`/events/${event.id}/register`}
                        className="mt-6 flex w-fit items-center gap-2 rounded-full bg-red-600 px-6 py-3 text-sm font-bold tracking-wide text-white uppercase transition hover:bg-red-700"
                    >
                        Register Now
                        <ArrowRight className="h-4 w-4" />
                    </Link>

                    {categories && categories.length > 0 && (
                        <div className="mt-10 flex flex-col gap-6">
                            <h2 className="text-2xl font-black tracking-tight uppercase">Categories &amp; Matches</h2>
                            {categories.map((category) => (
                                <BasketballCategorySection key={category.id} category={category} />
                            ))}
                        </div>
                    )}
                </section>
            </PublicLayout>
        </>
    );
}
