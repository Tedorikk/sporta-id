import { ArrowRight, Compass } from 'lucide-react';

export function HeroSection() {
    return (
        <section
            className="relative overflow-hidden bg-gradient-to-br from-red-700 via-red-800 to-neutral-950"
            style={{ clipPath: 'polygon(0 0, 100% 0, 100% 92%, 0 100%)' }}
        >
            <div className="pointer-events-none absolute inset-0 opacity-10">
                <svg
                    className="h-full w-full"
                    xmlns="http://www.w3.org/2000/svg"
                >
                    <defs>
                        <pattern
                            id="hero-grid"
                            width="28"
                            height="28"
                            patternUnits="userSpaceOnUse"
                        >
                            <path
                                d="M 28 0 L 0 0 0 28"
                                fill="none"
                                stroke="white"
                                strokeWidth="0.5"
                            />
                        </pattern>
                    </defs>
                    <rect width="100%" height="100%" fill="url(#hero-grid)" />
                </svg>
            </div>
            <div className="absolute top-1/2 -right-24 h-72 w-72 -translate-y-1/2 rotate-12 border-8 border-white/10" />

            <div
                className="relative mx-auto flex max-w-6xl flex-col items-start gap-6 px-6 py-24"
                id="about"
            >
                <span className="rounded-full border-2 border-white/40 bg-white/10 px-4 py-1 text-xs font-bold tracking-[0.3em] uppercase">
                    Sporta Indonesia
                </span>
                <h1 className="max-w-2xl text-5xl leading-[1.05] font-black tracking-tight uppercase sm:text-6xl">
                    Support Your <span className="text-red-300">Talent</span>.
                </h1>
                <p className="max-w-lg text-lg text-white/80">
                    Based in Pontianak, West Kalimantan, we design and organize
                    sports and arts events across Indonesia and beyond — helping
                    athletes and communities grow, one event at a time.
                </p>
                <div className="flex flex-wrap gap-4 pt-2">
                    <a
                        href="#events"
                        className="flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-bold tracking-wide text-red-700 uppercase shadow-lg transition hover:bg-neutral-100 active:scale-95"
                    >
                        See Upcoming Events
                        <ArrowRight className="h-4 w-4" />
                    </a>
                    <a
                        href="#flagship-event"
                        className="flex items-center gap-2 rounded-full border-2 border-blue-400 px-6 py-3 text-sm font-bold tracking-wide text-blue-200 uppercase transition hover:bg-blue-500/10 active:scale-95"
                    >
                        <Compass className="h-4 w-4" />
                        Our Biggest Event
                    </a>
                </div>
            </div>
        </section>
    );
}
