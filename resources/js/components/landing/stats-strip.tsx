import { STATS } from '@/data/landing-content';

export function StatsStrip() {
    return (
        <section className="mx-auto grid max-w-6xl grid-cols-2 gap-4 px-6 py-14 lg:grid-cols-4">
            {STATS.map((stat) => (
                <div
                    key={stat.label}
                    className="flex flex-col gap-1 rounded-2xl border-2 border-white/15 bg-white/5 p-6 text-center"
                >
                    <span className="font-heading text-4xl font-black tracking-tight text-red-400">
                        {stat.value}
                    </span>
                    <span className="text-xs font-bold tracking-wide text-white/70 uppercase">
                        {stat.label}
                    </span>
                    {stat.footnote && (
                        <span className="mt-1 text-[11px] text-white/40">
                            {stat.footnote}
                        </span>
                    )}
                </div>
            ))}
        </section>
    );
}
