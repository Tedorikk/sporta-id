import { ArrowRight, Flag } from 'lucide-react';
import { CountUp, parseStatValue } from '@/components/landing/count-up';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { STATS } from '@/data/landing-content';
import { useT } from '@/hooks/use-t';

const CATEGORIES = ['5K', '10K', 'Half Marathon', 'Full Marathon'];

export function HeroSection() {
    const { t } = useT();
    const events = parseStatValue(STATS[1].value);
    const experience = parseStatValue(STATS[0].value);

    return (
        <section className="mx-auto max-w-6xl px-6 pt-10 pb-16" id="about">
            <div className="relative overflow-hidden rounded-[28px] bg-[#0c0d0a] px-6 py-10 text-paper sm:px-10 sm:py-14">
                <div
                    className="pointer-events-none absolute inset-0"
                    style={{
                        background:
                            'radial-gradient(circle at 82% 15%, rgba(224,51,42,0.28), transparent 55%)',
                    }}
                />

                <div className="relative grid grid-cols-1 gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
                    <div>
                        <Badge className="mb-6 rounded-full border-none bg-white/10 px-3 py-1 text-[0.7rem] font-semibold tracking-wide text-paper/80">
                            {t('Since 2011 — Pontianak, West Kalimantan')}
                        </Badge>

                        <h1 className="font-display max-w-xl text-5xl leading-[1.05] font-bold tracking-tight sm:text-6xl">
                            {t('Support your talent.')}
                        </h1>

                        <p className="mt-6 max-w-md text-base leading-relaxed text-paper/65">
                            {t(
                                'Based in Pontianak, West Kalimantan, we design and organize sports and arts events across Indonesia and beyond — helping athletes and communities grow, one event at a time.',
                            )}
                        </p>

                        <div className="mt-8 flex flex-wrap gap-3">
                            <Button
                                asChild
                                size="lg"
                                className="rounded-full bg-poster-red px-7 text-paper hover:bg-poster-red/90"
                            >
                                <a href="#events">{t('See Upcoming Events')}</a>
                            </Button>
                            <Button
                                asChild
                                variant="outline"
                                size="lg"
                                className="rounded-full border-white/25 bg-transparent px-7 text-paper hover:bg-white/10 hover:text-paper"
                            >
                                <a href="#at-a-glance">{t('About Us')}</a>
                            </Button>
                        </div>
                    </div>

                    <div className="relative h-64 overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-white/[0.06] to-transparent sm:h-72">
                        <Flag
                            className="absolute top-1/2 left-1/2 h-56 w-56 -translate-x-1/2 -translate-y-1/2 text-white/[0.06]"
                            strokeWidth={1}
                        />

                        <div className="absolute top-4 left-4 rounded-2xl bg-black/40 px-4 py-3 backdrop-blur-sm">
                            <span className="font-display block text-2xl font-bold text-paper">
                                <CountUp value={events.number} suffix={events.suffix} />
                            </span>
                            <span className="text-[0.7rem] text-paper/60">
                                {t('Events Organized')}
                            </span>
                        </div>

                        <a
                            href="#events"
                            className="absolute right-4 bottom-4 flex items-center gap-1.5 rounded-2xl bg-poster-red px-4 py-3 text-sm font-semibold text-paper transition hover:bg-poster-red/90"
                        >
                            {t('Browse Events')}
                            <ArrowRight className="h-3.5 w-3.5" />
                        </a>
                    </div>
                </div>

                <div className="relative mt-10 flex flex-wrap gap-x-10 gap-y-4 border-t border-white/10 pt-6">
                    <div className="text-xs text-paper/50">
                        <span className="font-display block text-sm font-semibold text-paper">
                            {CATEGORIES.map((c) => t(c)).join(' · ')}
                        </span>
                        {t('Distances on offer')}
                    </div>
                    <div className="text-xs text-paper/50">
                        <span className="font-display block text-sm font-semibold text-paper">
                            <CountUp value={experience.number} suffix={experience.suffix} />{' '}
                            {t('years')}
                        </span>
                        {t('Running events since 2011')}
                    </div>
                </div>
            </div>
        </section>
    );
}
