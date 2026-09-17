import { CountUp, parseStatValue } from '@/components/landing/count-up';
import { STATS } from '@/data/landing-content';
import { useT } from '@/hooks/use-t';

export function StatsStrip() {
    const { t } = useT();

    return (
        <section className="mx-auto grid max-w-6xl grid-cols-2 gap-3 px-6 py-14 lg:grid-cols-4">
            {STATS.map((stat) => {
                const parsed = parseStatValue(stat.value);

                return (
                    <div
                        key={stat.label}
                        className="flex flex-col gap-1 rounded-2xl bg-[#0c0d0a] p-6 text-center text-paper"
                    >
                        <span className="font-display text-4xl font-bold text-poster-red">
                            <CountUp value={parsed.number} suffix={parsed.suffix} />
                        </span>
                        <span className="text-xs font-semibold tracking-wide text-paper/70 uppercase">
                            {t(stat.label)}
                        </span>
                        {stat.footnote && (
                            <span className="mt-1 text-[11px] text-paper/40">
                                {t(stat.footnote)}
                            </span>
                        )}
                    </div>
                );
            })}
        </section>
    );
}
