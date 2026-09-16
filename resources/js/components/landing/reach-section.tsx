import { Globe2 } from 'lucide-react';
import { REACH_CITIES, REACH_INTERNATIONAL } from '@/data/landing-content';
import { useT } from '@/hooks/use-t';

export function ReachSection() {
    const { t } = useT();

    return (
        <section id="reach" className="mx-auto max-w-6xl px-6 py-14">
            <div className="mb-8">
                <span className="text-xs font-bold tracking-[0.3em] text-red-500 uppercase">
                    {t('Our Reach')}
                </span>
                <h2 className="text-3xl font-black tracking-tight uppercase">
                    {t('From Pontianak To The Region')}
                </h2>
            </div>

            <div className="flex flex-wrap gap-3">
                {REACH_CITIES.map((city) => (
                    <span
                        key={city}
                        className="rounded-full border-2 border-white/20 px-4 py-1.5 text-sm font-semibold tracking-wide uppercase"
                    >
                        {city}
                    </span>
                ))}
                {REACH_INTERNATIONAL.map((place) => (
                    <span
                        key={place}
                        className="flex items-center gap-1.5 rounded-full border-2 border-blue-500/40 bg-blue-500/10 px-4 py-1.5 text-sm font-semibold tracking-wide text-blue-300 uppercase"
                    >
                        <Globe2 className="h-3.5 w-3.5" />
                        {place}
                    </span>
                ))}
            </div>
        </section>
    );
}
