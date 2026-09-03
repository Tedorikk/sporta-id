import { ArrowUpRight, Footprints } from 'lucide-react';

const DISTANCES = ['5K', '10K', 'Half Marathon', 'Full Marathon'];

export function FlagshipEventSection() {
    return (
        <section id="flagship-event" className="mx-auto max-w-6xl px-6 py-14">
            <div className="relative overflow-hidden rounded-3xl border-2 border-white/15 bg-gradient-to-br from-red-700 via-red-800 to-neutral-950 px-6 py-14 sm:px-12">
                <div className="pointer-events-none absolute inset-0 opacity-10">
                    <svg
                        className="h-full w-full"
                        xmlns="http://www.w3.org/2000/svg"
                    >
                        <defs>
                            <pattern
                                id="flagship-grid"
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
                        <rect
                            width="100%"
                            height="100%"
                            fill="url(#flagship-grid)"
                        />
                    </svg>
                </div>

                <div className="relative flex flex-col gap-6">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl border-2 border-white/40 bg-white/15">
                        <Footprints className="h-5 w-5 text-white" />
                    </div>
                    <div>
                        <span className="text-xs font-bold tracking-[0.3em] text-white/70 uppercase">
                            Our Biggest Event
                        </span>
                        <h2 className="mt-2 text-4xl font-black tracking-tight uppercase sm:text-5xl">
                            Pontianak City Run
                        </h2>
                    </div>
                    <p className="max-w-xl text-white/80">
                        The biggest running event in Pontianak and West
                        Kalimantan, bringing together thousands of runners every
                        year across four distance categories.
                    </p>
                    <div className="flex flex-wrap gap-3">
                        {DISTANCES.map((distance) => (
                            <span
                                key={distance}
                                className="rounded-full border-2 border-white/30 bg-white/10 px-4 py-1.5 text-sm font-bold tracking-wide uppercase"
                            >
                                {distance}
                            </span>
                        ))}
                    </div>
                    <a
                        href="https://pontianakcityrun.com"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex w-fit items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-bold tracking-wide text-red-700 uppercase shadow-lg transition hover:bg-neutral-100 active:scale-95"
                    >
                        Visit pontianakcityrun.com
                        <ArrowUpRight className="h-4 w-4" />
                    </a>
                </div>
            </div>
        </section>
    );
}
