import { Head, Link, router } from '@inertiajs/react';
import {
    ChevronLeft,
    Calendar,
    Tag,
    Phone,
    Trash2,
    Pencil,
} from 'lucide-react';
import { useState } from 'react';
import { DeleteConfirmationDialog } from '@/components/delete-confirmation-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatDate } from '@/lib/format-date';
import { formatImageUrl } from '@/lib/image-utils';
import events from '@/routes/events';
import type { Event } from '@/types/event';
import { BasketballManagement } from './basketball-management';

export default function ShowEvent({ event }: { event: Event }) {
    const [isDeleting, setIsDeleting] = useState(false);

    const handleDelete = () => {
        setIsDeleting(true);
        router.delete(`/events/${event.id}`, {
            onSuccess: () => router.visit('/dashboard/events'),
            onFinish: () => setIsDeleting(false),
        });
    };

    return (
        <div className="mx-auto flex h-full w-full max-w-6xl flex-1 flex-col gap-8 overflow-x-hidden px-4 py-6 md:px-8 md:py-8">
            <Head title={event.name} />

            {/* Header Section */}
            <section
                id="header"
                className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"
            >
                <div className="flex items-start gap-4">
                    <Button
                        variant="outline"
                        size="icon"
                        className="mt-1 h-10 w-10 shrink-0"
                        asChild
                    >
                        <Link href="/dashboard/events">
                            <ChevronLeft className="h-5 w-5" />
                        </Link>
                    </Button>
                    <div className="flex flex-col gap-2">
                        <h1 className="text-3xl font-extrabold tracking-tight text-balance text-foreground sm:text-4xl">
                            {event.name}
                        </h1>
                        <div className="flex items-center gap-3">
                            <Badge
                                variant={
                                    event.is_published ? 'default' : 'secondary'
                                }
                            >
                                {event.is_published ? 'Published' : 'Draft'}
                            </Badge>
                            {/* Optional: Add more top-level meta here later */}
                        </div>
                    </div>
                </div>
            </section>

            <div className="grid grid-cols-1 gap-8">
                {event.category === 'BASKETBALL' && (
                    <BasketballManagement key={event.id} event={event} categories={event.basketball_categories ?? []} />
                )}
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
                {/* Left Column (Main Event Content) */}
                <div className="flex flex-col gap-8 lg:col-span-2">
                    {event.banner && (
                        <section
                            id="banner"
                            className="overflow-hidden rounded-2xl border bg-muted shadow-sm"
                        >
                            <img
                                src={formatImageUrl(event.banner)}
                                alt={`${event.name} cover`}
                                /* Changed aspect-video to aspect-[4/5] to lock the 4:5 Instagram ratio */
                                className="aspect-4/5 w-full object-cover transition-transform duration-500 hover:scale-[1.01]"
                            />
                        </section>
                    )}
                </div>

                {/* Right Column (Sidebar Sticky Metadata) */}
                <div className="flex flex-col gap-6 lg:col-span-1">
                    <section
                        id="details"
                        className="flex flex-col gap-4 rounded-xl border bg-card p-6 shadow-sm md:p-8"
                    >
                        <h2 className="border-b pb-4 text-xl font-semibold tracking-tight">
                            About this event
                        </h2>
                        <div className="prose prose-sm sm:prose-base dark:prose-invert max-w-none leading-relaxed whitespace-pre-wrap text-muted-foreground">
                            {event.description || (
                                <span className="italic">
                                    No description provided.
                                </span>
                            )}
                        </div>
                    </section>
                    <div className="sticky top-6 flex flex-col gap-6 rounded-xl border bg-card shadow-sm">
                        <div className="border-b p-6 pb-4">
                            <h3 className="font-semibold tracking-tight">
                                Information
                            </h3>
                        </div>

                        <div className="flex flex-col gap-6 p-6 pt-0">
                            {/* Date Block */}
                            <div className="flex items-start gap-4">
                                <div className="rounded-md bg-primary/10 p-2 text-primary">
                                    <Calendar className="h-5 w-5" />
                                </div>
                                <div className="flex flex-col gap-1">
                                    <span className="text-sm leading-none font-medium">
                                        Date & Time
                                    </span>
                                    <span className="mt-1 text-sm text-muted-foreground">
                                        {formatDate(event.start_date)}
                                    </span>
                                    <span className="text-sm text-muted-foreground">
                                        to {formatDate(event.end_date)}
                                    </span>
                                </div>
                            </div>

                            {/* Category Block */}
                            <div className="flex items-start gap-4">
                                <div className="rounded-md bg-primary/10 p-2 text-primary">
                                    <Tag className="h-5 w-5" />
                                </div>
                                <div className="flex flex-col gap-1">
                                    <span className="text-sm leading-none font-medium">
                                        Category
                                    </span>
                                    <div className="mt-1">
                                        <Badge variant="outline">
                                            {event.category}
                                        </Badge>
                                    </div>
                                </div>
                            </div>

                            {/* Contact Block */}
                            <div className="flex items-start gap-4">
                                <div className="rounded-md bg-primary/10 p-2 text-primary">
                                    <Phone className="h-5 w-5" />
                                </div>
                                <div className="flex flex-col gap-1">
                                    <span className="text-sm leading-none font-medium">
                                        Contact
                                    </span>
                                    <span className="mt-1 text-sm text-muted-foreground">
                                        {event.contact_person}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex flex-col gap-2 border-t p-6 pt-4">
                            <Button
                                variant="outline"
                                className="w-full justify-center"
                                asChild
                            >
                                <Link
                                    href={`/dashboard/events/${event.id}/edit`}
                                >
                                    <Pencil className="mr-2 h-4 w-4" />
                                    Edit
                                </Link>
                            </Button>

                            <DeleteConfirmationDialog
                                trigger={
                                    <Button
                                        variant="destructive"
                                        className="w-full justify-center"
                                    >
                                        <Trash2 className="mr-2 h-4 w-4" />
                                        Delete
                                    </Button>
                                }
                                confirmationValue={event.name}
                                description={
                                    <>
                                        This will permanently delete{' '}
                                        <span className="font-semibold text-foreground">
                                            {event.name}
                                        </span>
                                        . This action cannot be undone. Type the
                                        event name below to confirm.
                                    </>
                                }
                                onConfirm={handleDelete}
                                isDeleting={isDeleting}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

ShowEvent.layout = {
    breadcrumbs: [
        {
            title: 'Events',
            href: events.index(),
        },
        {
            title: 'View Event',
            href: '#',
        },
    ],
};
