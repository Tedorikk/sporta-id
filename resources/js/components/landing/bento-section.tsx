import { Link } from '@inertiajs/react';
import { ArrowUpRight, Globe2, QrCode } from 'lucide-react';
import { useState } from 'react';
import { CountUp, parseStatValue } from '@/components/landing/count-up';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { REACH_CITIES, REACH_INTERNATIONAL, STATS } from '@/data/landing-content';
import { useT } from '@/hooks/use-t';

const DISTANCES = ['5K', '10K', 'Half Marathon', 'Full Marathon'];

export function BentoSection() {
    const { t } = useT();
    const [spot, setSpot] = useState({ x: 50, y: 50 });

    return (
        <section id="at-a-glance" className="mx-auto max-w-6xl px-6 py-14">
            <h2 className="font-display mb-8 border-t border-ink/10 pt-8 text-3xl font-bold">
                {t('At a glance')}
            </h2>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
                {/* Flagship event — the one bold, dark moment in the grid, matching the hero */}
                <a
                    href="https://pontianakcityrun.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    onMouseMove={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        setSpot({
                            x: ((e.clientX - rect.left) / rect.width) * 100,
                            y: ((e.clientY - rect.top) / rect.height) * 100,
                        });
                    }}
                    className="group relative col-span-1 row-span-1 flex flex-col justify-between gap-4 overflow-hidden rounded-2xl bg-[#0c0d0a] p-6 text-paper sm:col-span-2 sm:row-span-2"
                >
                    <div
                        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                        style={{
                            background: `radial-gradient(280px circle at ${spot.x}% ${spot.y}%, rgba(224,51,42,0.28), transparent 70%)`,
                        }}
                    />

                    <div className="relative">
                        <Badge className="rounded-full border-none bg-white/10 px-3 py-1 text-[11px] font-semibold tracking-widest text-paper/70 uppercase">
                            {t('Our Biggest Event')}
                        </Badge>
                        <h3 className="font-display mt-3 text-3xl font-bold">
                            Pontianak City Run
                        </h3>
                        <p className="mt-3 max-w-sm text-sm text-paper/70">
                            {t(
                                'The biggest running event in Pontianak and West Kalimantan, bringing together thousands of runners every year.',
                            )}
                        </p>
                    </div>
                    <div className="relative">
                        <div className="mb-4 flex flex-wrap gap-x-3 gap-y-1 text-xs text-paper/60">
                            {DISTANCES.map((d, i) => (
                                <span key={d}>
                                    {t(d)}
                                    {i < DISTANCES.length - 1 && (
                                        <span className="ml-3 text-paper/30">·</span>
                                    )}
                                </span>
                            ))}
                        </div>
                        <span className="inline-flex items-center gap-1 text-sm font-semibold text-paper underline-offset-4 group-hover:underline">
                            {t('Visit pontianakcityrun.com')}
                            <ArrowUpRight className="h-3.5 w-3.5" />
                        </span>
                    </div>
                </a>

                {/* Four stat tiles fill the block beside the flagship tile */}
                {STATS.map((stat) => {
                    const parsed = parseStatValue(stat.value);

                    return (
                        <div
                            key={stat.label}
                            className="col-span-1 flex flex-col justify-between gap-2 rounded-2xl border border-ink/10 bg-[#0c0d0a] p-5"
                        >
                            <span className="font-display text-3xl font-semibold text-poster-red">
                                <CountUp value={parsed.number} suffix={parsed.suffix} />
                            </span>
                            <span className="text-xs font-semibold tracking-wide text-paper/60 uppercase">
                                {t(stat.label)}
                            </span>
                        </div>
                    );
                })}

                {/* Reach */}
                <div className="col-span-1 rounded-2xl border border-ink/10 bg-[#0c0d0a] p-6 text-paper sm:col-span-2">
                    <h3 className="mb-4 text-xs font-semibold tracking-widest text-paper/40 uppercase">
                        {t('From Pontianak To The Region')}
                    </h3>
                    <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-paper/70">
                        {REACH_CITIES.map((city) => (
                            <span key={city}>{city}</span>
                        ))}
                        {REACH_INTERNATIONAL.map((place) => (
                            <span
                                key={place}
                                className="inline-flex items-center gap-1 text-poster-red"
                            >
                                <Globe2 className="h-3.5 w-3.5" />
                                {place}
                            </span>
                        ))}
                    </div>
                </div>

                {/* ID lookup teaser */}
                <div className="col-span-1 flex flex-col justify-between gap-3 rounded-2xl border border-ink/10 bg-[#0c0d0a] p-6 text-paper sm:col-span-2">
                    <div>
                        <h3 className="text-xs font-semibold tracking-widest text-paper/40 uppercase">
                            {t('Already Registered?')}
                        </h3>
                        <p className="mt-2 text-sm text-paper/60">
                            {t(
                                'Find your digital ID card again anytime, no app required.',
                            )}
                        </p>
                    </div>
                    <Button
                        asChild
                        className="w-fit rounded-full bg-poster-red text-paper hover:bg-poster-red/90"
                    >
                        <Link href="/find-id">
                            <QrCode className="h-4 w-4" />
                            {t('Find My ID Card')}
                        </Link>
                    </Button>
                </div>
            </div>
        </section>
    );
}
