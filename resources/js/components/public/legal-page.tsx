import { Head } from '@inertiajs/react';
import type { ReactNode } from 'react';
import { PublicPageHeader } from '@/components/public/public-page-header';
import PublicLayout from '@/layouts/public-layout';

interface LegalPageProps {
    eyebrow: string;
    title: string;
    subtitle: string;
    lastUpdated: string;
    children: ReactNode;
}

/** Shared shell for the Terms / Privacy / Refund pages so all three read alike. */
export function LegalPage({
    eyebrow,
    title,
    subtitle,
    lastUpdated,
    children,
}: LegalPageProps) {
    return (
        <>
            <Head title={`${title} — Sporta Indonesia`} />

            <PublicLayout>
                <PublicPageHeader
                    eyebrow={eyebrow}
                    title={title}
                    subtitle={subtitle}
                />

                <section className="mx-auto max-w-3xl px-6 py-14">
                    <p className="mb-8 text-xs tracking-wide text-white/40 uppercase">
                        Last updated: {lastUpdated}
                    </p>
                    <div className="flex flex-col gap-8 text-white/75">
                        {children}
                    </div>
                </section>
            </PublicLayout>
        </>
    );
}

export function LegalSection({
    heading,
    children,
}: {
    heading: string;
    children: ReactNode;
}) {
    return (
        <div className="flex flex-col gap-3">
            <h2 className="text-lg font-black tracking-tight text-white uppercase">
                {heading}
            </h2>
            {children}
        </div>
    );
}
