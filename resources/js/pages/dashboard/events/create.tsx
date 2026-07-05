import { Head, Link } from '@inertiajs/react';
import { ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import events from '@/routes/events';
import EventForm from './components/event-form';

export default function CreateEvent() {
    return (
        <div className="flex h-full flex-1 flex-col gap-4 overflow-x-auto rounded-xl px-12 py-4">
            <Head title="Create Event" />
            <section id="title">
                <div className="flex w-full flex-row items-center justify-start gap-4">
                    <Button variant={'outline'} className="m-0 h-10 w-10 p-0">
                        <Link href="/dashboard/events">
                            <ChevronLeft />
                        </Link>
                    </Button>
                    <div>
                        <h1 className="scroll-m-20 text-4xl font-bold tracking-tight text-balance">
                            Create New Event
                        </h1>
                        <p className="">
                            Fill out the form below to create a new event.
                        </p>
                    </div>
                </div>
            </section>
            <section id="form">
                <EventForm />
            </section>
        </div>
    );
}

CreateEvent.layout = {
    breadcrumbs: [
        {
            title: 'Events',
            href: events.index(),
        },
        {
            title: 'Create Event',
            href: events.create(),
        },
    ],
};
