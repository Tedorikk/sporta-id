import { Head, Link } from '@inertiajs/react';
import { ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import events from '@/routes/events';
import type { Event } from '@/types/event';
import TeamForm from './components/team-form';
import type { BasketballEventCategory } from '@/types/basketball-event-category';

export default function CreateTeam({
    event,
    categories,
}: {
    event: Event;
    categories: BasketballEventCategory[];
}) {
    return (
        <div className="flex h-full flex-1 flex-col gap-4 overflow-x-auto rounded-xl px-12 py-4">
            <Head title={`Create New Team - ${event.name}`} />
            <section id="title">
                <div className="flex w-full flex-row items-center justify-start gap-4">
                    <Button
                        variant={'outline'}
                        className="m-0 h-10 w-10 p-0"
                        asChild
                    >
                        <Link href={`/dashboard/events/${event.id}/teams`}>
                            <ChevronLeft />
                        </Link>
                    </Button>
                    <div>
                        <h1 className="scroll-m-20 text-4xl font-bold tracking-tight text-balance">
                            Create New Team
                        </h1>
                        <p className="">
                            Register new team for tournament {event.name}
                        </p>
                    </div>
                </div>
            </section>
            <section id="form">
                <TeamForm event={event} categories={categories} />
            </section>
        </div>
    );
}

CreateTeam.layout = {
    breadcrumbs: [
        {
            title: 'Events',
            href: events.index(),
        },
        {
            title: 'Teams',
            href: '/dashboard/events/:eventId/teams',
        },
        {
            title: 'Create New Team',
            href: '#',
        },
    ],
};