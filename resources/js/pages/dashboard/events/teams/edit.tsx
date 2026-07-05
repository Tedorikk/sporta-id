import { Head, Link } from '@inertiajs/react';
import { ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import events from '@/routes/events';
import type { Event } from '@/types/event';
import type { Team } from '@/types/team';
import TeamForm from './components/team-form';

export default function EditTeam({
    event,
    team,
}: {
    event: Event;
    team: Team;
}) {
    return (
        <div className="flex h-full flex-1 flex-col gap-4 overflow-x-auto rounded-xl px-12 py-4">
            <Head title={`Edit ${team.name}`} />
            <section id="title">
                <div className="flex w-full flex-row items-center justify-start gap-4">
                    <Button
                        variant={'outline'}
                        className="m-0 h-10 w-10 p-0"
                        asChild
                    >
                        <Link
                            href={`/dashboard/events/${event.id}/teams/${team.id}`}
                        >
                            <ChevronLeft />
                        </Link>
                    </Button>
                    <div>
                        <h1 className="scroll-m-20 text-4xl font-bold tracking-tight text-balance">
                            Edit Team
                        </h1>
                        <p className="">
                            Update the details for &quot;{team.name}&quot;.
                        </p>
                    </div>
                </div>
            </section>
            <section id="form">
                <TeamForm event={event} team={team} />
            </section>
        </div>
    );
}

EditTeam.layout = {
    breadcrumbs: [
        { title: 'Events', href: events.index() },
        { title: 'Edit Team', href: '#' },
    ],
};