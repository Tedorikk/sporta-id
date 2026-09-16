import { Head } from '@inertiajs/react';
import { StatsStrip } from '@/components/landing/stats-strip';
import { PublicPageHeader } from '@/components/public/public-page-header';
import { useT } from '@/hooks/use-t';
import PublicLayout from '@/layouts/public-layout';

export default function About() {
    const { t } = useT();

    return (
        <>
            <Head title={t('About Us — Sporta Indonesia')} />

            <PublicLayout>
                <PublicPageHeader
                    languageToggle={false}
                    eyebrow={t('About Us')}
                    title={t('Our Story')}
                    subtitle={t(
                        'From a small running community in Pontianak to a national event organizer.',
                    )}
                />

                <section className="mx-auto max-w-3xl px-6 py-14">
                    <div className="flex flex-col gap-6 text-white/80">
                        <p>
                            {t(
                                'Sporta Indonesia began in 2011 as a community of friends organizing local running events in Pontianak, West Kalimantan. What started as a shared passion for sports grew steadily, and in 2019 we became a formal company — turning that community spirit into a professional event organization.',
                            )}
                        </p>
                        <p>
                            {t(
                                'Today, we design and run sports and arts events across Indonesia — from our home city of Pontianak to Palangka Raya, Makassar, Jakarta, and beyond — and have been invited to organize events internationally in Kuching, Malaysia.',
                            )}
                        </p>
                        <p>
                            {t('Our tagline,')}{' '}
                            <span className="font-bold text-red-400">
                                &ldquo;Support Your Talent&rdquo;
                            </span>
                            {t(
                                ', reflects our mission: helping athletes and communities across Indonesia grow and reach their potential through the events we organize.',
                            )}
                        </p>
                    </div>
                </section>

                <StatsStrip />
            </PublicLayout>
        </>
    );
}
