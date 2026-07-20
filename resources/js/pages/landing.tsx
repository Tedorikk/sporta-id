import { Head, Link } from '@inertiajs/react';
import { ArrowRight, Calendar, QrCode, ShieldCheck, Trophy } from 'lucide-react';
import AppLogoIcon from '@/components/app-logo-icon';
import { formatDate } from '@/lib/format-date';
import { formatImageUrl } from '@/lib/image-utils';
import type { Event } from '@/types/event';

interface Props {
    events: Event[];
}

const STATUS_STYLE: Record<string, string> = {
    upcoming: 'bg-amber-400 text-amber-950',
    ongoing: 'bg-emerald-500 text-white',
    past: 'bg-neutral-400 text-neutral-950',
};

export default function Landing({ events }: Props) {
    return (
        <>
            <Head title="Sporta ID — Player & Team Identity" />

            <div className="min-h-screen bg-neutral-950 text-white">
                {/* Nav */}
                <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
                    <div className="flex items-center gap-2">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg border-2 border-white bg-red-600">
                            <AppLogoIcon className="h-5 w-5 fill-current text-white" />
                        </div>
                        <span className="text-lg font-black tracking-tight uppercase">Sporta ID</span>
                    </div>
                    <Link
                        href="/login"
                        className="text-xs font-semibold tracking-wide text-white/50 uppercase transition hover:text-white"
                    >
                        Admin Login
                    </Link>
                </nav>

                {/* Hero */}
                <section
                    className="relative overflow-hidden bg-gradient-to-br from-red-700 via-red-800 to-neutral-950"
                    style={{ clipPath: 'polygon(0 0, 100% 0, 100% 92%, 0 100%)' }}
                >
                    <div className="pointer-events-none absolute inset-0 opacity-10">
                        <svg className="h-full w-full" xmlns="http://www.w3.org/2000/svg">
                            <defs>
                                <pattern id="hero-grid" width="28" height="28" patternUnits="userSpaceOnUse">
                                    <path d="M 28 0 L 0 0 0 28" fill="none" stroke="white" strokeWidth="0.5" />
                                </pattern>
                            </defs>
                            <rect width="100%" height="100%" fill="url(#hero-grid)" />
                        </svg>
                    </div>
                    <div className="absolute top-1/2 -right-24 h-72 w-72 -translate-y-1/2 rotate-12 border-8 border-white/10" />

                    <div className="relative mx-auto flex max-w-6xl flex-col items-start gap-6 px-6 py-24">
                        <span className="rounded-full border-2 border-white/40 bg-white/10 px-4 py-1 text-xs font-bold tracking-[0.3em] uppercase">
                            Digital Player Identity
                        </span>
                        <h1 className="max-w-2xl text-5xl leading-[1.05] font-black tracking-tight uppercase sm:text-6xl">
                            Your game.
                            <br />
                            Your <span className="text-red-300">ID card</span>.
                        </h1>
                        <p className="max-w-lg text-lg text-white/80">
                            Register for your tournament, get a scannable digital ID card with your own QR code,
                            and find it again anytime — no app required.
                        </p>
                        <div className="flex flex-wrap gap-4 pt-2">
                            <Link
                                href="/find-id"
                                className="flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-bold tracking-wide text-red-700 uppercase shadow-lg transition hover:bg-neutral-100 active:scale-95"
                            >
                                <QrCode className="h-4 w-4" />
                                Find My ID Card
                            </Link>
                            <a
                                href="#events"
                                className="flex items-center gap-2 rounded-full border-2 border-white px-6 py-3 text-sm font-bold tracking-wide uppercase transition hover:bg-white/10 active:scale-95"
                            >
                                Browse Events
                                <ArrowRight className="h-4 w-4" />
                            </a>
                        </div>
                    </div>
                </section>

                {/* Feature strip */}
                <section className="mx-auto grid max-w-6xl grid-cols-1 gap-4 px-6 py-14 sm:grid-cols-3">
                    {[
                        {
                            icon: Trophy,
                            title: 'Pick Your Team',
                            desc: 'Select your category and the team your admin already registered.',
                        },
                        {
                            icon: ShieldCheck,
                            title: 'Get Verified',
                            desc: 'Fill your details and get a unique digital identity card.',
                        },
                        {
                            icon: QrCode,
                            title: 'Scan Anywhere',
                            desc: 'Show your QR code at check-in — no printing needed.',
                        },
                    ].map(({ icon: Icon, title, desc }) => (
                        <div
                            key={title}
                            className="flex flex-col gap-3 rounded-2xl border-2 border-white/15 bg-white/5 p-6"
                        >
                            <div className="flex h-11 w-11 items-center justify-center rounded-xl border-2 border-red-500 bg-red-600/20">
                                <Icon className="h-5 w-5 text-red-400" />
                            </div>
                            <h3 className="text-base font-bold tracking-tight uppercase">{title}</h3>
                            <p className="text-sm text-white/60">{desc}</p>
                        </div>
                    ))}
                </section>

                {/* Events */}
                <section id="events" className="mx-auto max-w-6xl px-6 py-14">
                    <div className="mb-8 flex items-end justify-between">
                        <div>
                            <span className="text-xs font-bold tracking-[0.3em] text-red-500 uppercase">
                                Open Registration
                            </span>
                            <h2 className="text-3xl font-black tracking-tight uppercase">Events</h2>
                        </div>
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
                                    <div className="relative h-36 overflow-hidden bg-gradient-to-br from-red-700 to-neutral-900">
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

                {/* Footer */}
                <footer className="border-t-2 border-white/10 px-6 py-8 text-center text-xs text-white/40">
                    Sporta ID · {new Date().getFullYear()}
                </footer>
            </div>
        </>
    );
}
