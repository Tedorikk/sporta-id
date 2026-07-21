import { Head } from '@inertiajs/react';
import { EventsSection } from '@/components/landing/events-section';
import { FlagshipEventSection } from '@/components/landing/flagship-event-section';
import { HeroSection } from '@/components/landing/hero-section';
import { ReachSection } from '@/components/landing/reach-section';
import { StatsStrip } from '@/components/landing/stats-strip';
import PublicLayout from '@/layouts/public-layout';
import type { Event } from '@/types/event';

interface Props {
    events: Event[];
}

export default function Landing({ events }: Props) {
    return (
        <>
            <Head title="Sporta Indonesia — Support Your Talent" />

            <PublicLayout>
                <HeroSection />
                <StatsStrip />
                <FlagshipEventSection />
                <ReachSection />
                <EventsSection events={events} />
            </PublicLayout>
        </>
    );
}
