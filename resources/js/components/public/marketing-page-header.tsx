import { Badge } from '@/components/ui/badge';

interface MarketingPageHeaderProps {
    eyebrow: string;
    title: string;
    subtitle?: string;
}

/** Dark hero-card header for narrative/browsing pages (About, Contact, legal, Events).
 *  Event-branded functional pages keep using PublicPageHeader instead. */
export function MarketingPageHeader({ eyebrow, title, subtitle }: MarketingPageHeaderProps) {
    return (
        <section className="mx-auto max-w-6xl px-6 pt-10 pb-4">
            <div className="relative overflow-hidden rounded-[28px] bg-[#0c0d0a] px-6 py-12 text-center text-paper sm:px-10">
                <div
                    className="pointer-events-none absolute inset-0"
                    style={{
                        background:
                            'radial-gradient(circle at 50% 0%, rgba(224,51,42,0.28), transparent 60%)',
                    }}
                />

                <div className="relative flex flex-col items-center gap-3">
                    <Badge className="rounded-full border-none bg-white/10 px-3 py-1 text-[11px] font-semibold tracking-widest text-paper/70 uppercase">
                        {eyebrow}
                    </Badge>
                    <h1 className="font-display text-3xl font-bold sm:text-4xl">{title}</h1>
                    {subtitle && <p className="max-w-md text-sm text-paper/65">{subtitle}</p>}
                </div>
            </div>
        </section>
    );
}
