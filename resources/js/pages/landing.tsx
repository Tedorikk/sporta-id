import { Head } from '@inertiajs/react';
import { EventsSection } from '@/components/landing/events-section';
import { FlagshipEventSection } from '@/components/landing/flagship-event-section';
import { HeroSection } from '@/components/landing/hero-section';
import { ReachSection } from '@/components/landing/reach-section';
import { StatsStrip } from '@/components/landing/stats-strip';
import { useT } from '@/hooks/use-t';
import PublicLayout from '@/layouts/public-layout';
import type { Event } from '@/types/event';

interface Props {
    events: Event[];
}

export default function Landing({ events }: Props) {
    const { t } = useT();

    return (
        <>
            <Head title={t('Sporta Indonesia — Support Your Talent')} />

            <PublicLayout>
                <HeroSection />
                {/* Directly under the hero: what we sell and what it costs. The
                    company story below is context, not the reason to be here. */}
                <EventsSection events={events} />
                <StatsStrip />
                <FlagshipEventSection />
                <ReachSection />
            </PublicLayout>
        </>
    );
}
