import { Head, Link, router } from '@inertiajs/react';
import {
    ChevronLeft,
    Calendar,
    Tag,
    Phone,
    Trash2,
    Pencil,
    Link2,
    Palette,
    Swords,
    Users,
    ClipboardList,
    Mic,
    Trophy,
} from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { DeleteConfirmationDialog } from '@/components/delete-confirmation-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { formatDate } from '@/lib/format-date';
import { formatImageUrl } from '@/lib/image-utils';
import { cn } from '@/lib/utils';
import events from '@/routes/events';
import type { Event, RunningEventSpecific } from '@/types/event';
import { BasketballManagement } from './basketball/basketball-management';
import { RunningManagement } from './running/running-management';

export default function ShowEvent({ event }: { event: Event }) {
    const [isDeleting, setIsDeleting] = useState(false);
    const [isTogglingRegistration, setIsTogglingRegistration] = useState(false);
    const isRace = event.category === 'RUNNING';
    // Only a race carries an event-level entries switch; basketball's moved
    // to the registration category, so its module cannot answer for one.
    const raceModule = isRace
        ? (event.specific as RunningEventSpecific | null | undefined)
        : null;
    const registrationOpen = raceModule?.registration_open ?? true;

    const handleDelete = () => {
        setIsDeleting(true);
        router.delete(`/events/${event.id}`, {
            onSuccess: () => router.visit('/dashboard/events'),
            onFinish: () => setIsDeleting(false),
        });
    };

    // The public event page lists every registration category with its
    // price and availability — that's the link to hand out.
    const handleCopyRegistrationLink = () => {
        const url = `${window.location.origin}/events/${event.id}`;
        navigator.clipboard.writeText(url);
        toast.success('Event link copied to clipboard');
    };

    const handleToggleRegistration = (checked: boolean) => {
        setIsTogglingRegistration(true);
        router.put(
            `/events/${event.id}/running`,
            { registration_open: checked },
            {
                preserveScroll: true,
                onFinish: () => setIsTogglingRegistration(false),
            },
        );
    };

    return (
        <div className="mx-auto flex h-full w-full max-w-6xl min-w-0 flex-1 flex-col gap-6 overflow-x-hidden px-4 py-6 sm:gap-8 md:px-8 md:py-8">
            <Head title={event.name} />

            {/* Header Section */}
            <section
                id="header"
                className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between"
            >
                {/* The toolbar only shares a row with the title from lg. Below
                    that it is far wider than the space available — at md the
                    fixed sidebar leaves ~425px, which squeezed the title to
                    66px and broke it over seven lines — so it stacks instead.
                    On the shared row the floor keeps the title readable: 20rem
                    fits one line of most names, and a longer name already
                    exceeds it, so the toolbar wraps into what is left. */}
                <div className="flex min-w-0 items-start gap-3 sm:gap-4 lg:min-w-80">
                    <Button
                        variant="outline"
                        size="icon"
                        className="mt-0.5 h-10 w-10 shrink-0 sm:mt-1"
                        asChild
                    >
                        <Link href="/dashboard/events">
                            <ChevronLeft className="h-5 w-5" />
                        </Link>
                    </Button>
                    <div className="flex min-w-0 flex-col gap-2">
                        <h1 className="text-2xl font-extrabold tracking-tight text-balance break-words text-foreground sm:text-3xl lg:text-4xl">
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
                <div className="flex flex-wrap items-center gap-2">
                    <Button variant="outline" size="sm" asChild>
                        <Link href={`/dashboard/events/${event.id}/attendees`}>
                            <Users className="mr-2 h-4 w-4" />
                            Attendees
                        </Link>
                    </Button>
                    <Button variant="outline" size="sm" asChild>
                        <Link
                            href={`/dashboard/events/${event.id}/registration-categories`}
                        >
                            <ClipboardList className="mr-2 h-4 w-4" />
                            Registration Categories
                        </Link>
                    </Button>
                    <Button variant="outline" size="sm" asChild>
                        <Link href={`/dashboard/events/${event.id}/meetings`}>
                            <Mic className="mr-2 h-4 w-4" />
                            Meetings & Speakers
                        </Link>
                    </Button>
                    <Button variant="outline" size="sm" asChild>
                        <Link href={`/dashboard/events/${event.id}/awards`}>
                            <Trophy className="mr-2 h-4 w-4" />
                            Awards &amp; Voting
                        </Link>
                    </Button>
                    <Button variant="outline" size="sm" asChild>
                        <Link
                            href={`/dashboard/events/${event.id}/id-card-templates`}
                        >
                            <Palette className="mr-2 h-4 w-4" />
                            Card Designer
                        </Link>
                    </Button>
                    {event.category === 'BASKETBALL' && (
                        <>
                            <Button variant="outline" size="sm" asChild>
                                <Link
                                    href={`/dashboard/events/${event.id}/matches`}
                                >
                                    <Swords className="mr-2 h-4 w-4" />
                                    All Matches
                                </Link>
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleCopyRegistrationLink}
                            >
                                <Link2 className="mr-2 h-4 w-4" />
                                Copy Event Link
                            </Button>
                        </>
                    )}
                    {/* A race carries a master switch for entries, closing
                        every distance's sign-up form at once. Only a race that
                        has actually been set up can answer for it. */}
                    {isRace && raceModule && (
                        <div className="flex items-center gap-2 rounded-md border px-3 py-2">
                            <Switch
                                id="registration-toggle"
                                checked={registrationOpen}
                                onCheckedChange={handleToggleRegistration}
                                disabled={isTogglingRegistration}
                            />
                            <label
                                htmlFor="registration-toggle"
                                className="cursor-pointer text-sm font-medium select-none"
                            >
                                Registration{' '}
                                {registrationOpen ? 'Open' : 'Closed'}
                            </label>
                        </div>
                    )}
                </div>
            </section>

            {/* Rendered only for a race, for the same reason as the
                basketball block below. */}
            {isRace && (
                <div className="grid min-w-0 grid-cols-1 gap-8">
                    <RunningManagement
                        key={event.id}
                        event={event}
                        categories={event.running_categories ?? []}
                    />
                </div>
            )}

            {/* Rendered only for basketball: an empty wrapper still costs a
                gap, which reads as dead space on a phone. */}
            {event.category === 'BASKETBALL' && (
                <div className="grid min-w-0 grid-cols-1 gap-8">
                    <BasketballManagement
                        key={event.id}
                        event={event}
                        categories={event.basketball_categories ?? []}
                        pools={event.pools ?? []}
                        teams={event.teams}
                    />
                </div>
            )}

            {/* Main Content Grid */}
            <div className="grid min-w-0 grid-cols-1 gap-6 sm:gap-8 lg:grid-cols-3">
                {/* Left Column (Main Event Content). With no banner it holds
                    nothing, so it is dropped below lg rather than contributing
                    an empty row; on lg it stays put to keep the sidebar right. */}
                <div
                    className={cn(
                        'flex min-w-0 flex-col gap-8 lg:col-span-2',
                        !event.banner && 'hidden lg:flex',
                    )}
                >
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
                <div className="flex min-w-0 flex-col gap-6 lg:col-span-1">
                    <section
                        id="details"
                        className="flex flex-col gap-4 rounded-xl border bg-card p-5 shadow-sm sm:p-6 md:p-8"
                    >
                        <h2 className="border-b pb-4 text-lg font-semibold tracking-tight sm:text-xl">
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
                    <div className="sticky top-6 flex min-w-0 flex-col gap-5 rounded-xl border bg-card shadow-sm sm:gap-6">
                        <div className="border-b p-5 pb-4 sm:p-6 sm:pb-4">
                            <h3 className="font-semibold tracking-tight">
                                Information
                            </h3>
                        </div>

                        <div className="flex flex-col gap-5 p-5 pt-0 sm:gap-6 sm:p-6 sm:pt-0">
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
                        <div className="flex flex-col gap-2 border-t p-5 pt-4 sm:p-6 sm:pt-4">
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
