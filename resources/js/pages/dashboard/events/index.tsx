import { Head, Link } from '@inertiajs/react';

import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardHeader,
    CardTitle,
    CardDescription,
    CardFooter,
} from '@/components/ui/card';

import { formatImageUrl } from '@/lib/image-utils';
import events from '@/routes/events';

import type { Event } from '@/types/event';

export default function EventsIndex({ events }: { events: Event[] }) {
    return (
        <>
            <Head title="Events" />
            <div className="flex h-full flex-1 flex-col gap-4 overflow-x-auto rounded-xl px-12 py-4">
                <section id="overview" className="grid-rows-2">
                    <div className="row-1 flex w-full flex-row justify-between">
                        <h1 className="scroll-m-20 text-4xl font-bold tracking-tight text-balance">
                            Overview
                        </h1>
                        <Button>
                            <Link
                                href="/dashboard/events/create"
                                className="flex h-full w-full items-center gap-2"
                            >
                                <Plus /> Add New
                            </Link>
                        </Button>
                    </div>
                    <div className="row-2"></div>
                </section>
                <section id="index">
                    {events.map((event) => (
                        <Card
                            className="relative mx-auto w-full max-w-sm pt-0"
                            key={event.id}
                        >
                            <div className="absolute inset-0 z-30 aspect-video bg-black/35" />
                            <img
                                src={
                                    event.banner
                                        ? formatImageUrl(event.banner)
                                        : undefined
                                }
                                alt="Event cover"
                                className="relative z-20 aspect-video w-full object-cover"
                            />
                            <CardHeader>
                                <CardTitle>{event.name}</CardTitle>
                                <CardDescription>
                                    {event.description}
                                </CardDescription>
                            </CardHeader>
                            <CardFooter>
                                <Button className="w-full" asChild>
                                    <Link
                                        href={`/dashboard/events/${event.id}`}
                                    >
                                        View Event
                                    </Link>
                                </Button>
                            </CardFooter>
                        </Card>
                    ))}
                </section>
            </div>
        </>
    );
}

EventsIndex.layout = {
    breadcrumbs: [
        {
            title: 'Events',
            href: events.index(),
        },
    ],
};
