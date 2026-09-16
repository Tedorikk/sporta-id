import { Link } from '@inertiajs/react';
import {
    CalendarDays,
    ClipboardList,
    ExternalLink,
    Link2,
    Pencil,
    Phone,
    SquareArrowOutUpRight,
    Tag,
    Ticket,
    Users,
} from 'lucide-react';
import { toast } from 'sonner';
import { EventBanner } from '@/components/event-banner';
import { Button } from '@/components/ui/button';
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from '@/components/ui/sheet';
import { Switch } from '@/components/ui/switch';
import { formatPriceRange } from '@/lib/format-currency';
import { formatDate } from '@/lib/format-date';
import type { Event } from '@/types/event';
import { EventLifecycleBadge, EventTimingBadge } from './event-badges';

interface Props {
    event: Event | null;
    isPublicationPending: boolean;
    onOpenChange: (open: boolean) => void;
    onTogglePublication: (event: Event, published: boolean) => void;
}

/**
 * A non-modal side panel: the list stays visible and clickable behind it, so an
 * admin can check one event against the rows around it instead of losing the
 * table to a modal.
 */
export function EventPeekPanel({
    event,
    isPublicationPending,
    onOpenChange,
    onTogglePublication,
}: Props) {
    const priceRange = event
        ? formatPriceRange(event.price_from, event.price_to)
        : null;

    function copyRegistrationLink(id: number) {
        navigator.clipboard.writeText(`${window.location.origin}/events/${id}`);
        toast.success('Event link copied to clipboard');
    }

    return (
        <Sheet open={!!event} onOpenChange={onOpenChange} modal={false}>
            <SheetContent
                overlay={false}
                className="w-full gap-0 overflow-y-auto sm:max-w-md"
                // Switching straight from one row's quick view to another's would
                // otherwise close the panel before the new one opens.
                onInteractOutside={(e) => {
                    if (
                        e.target instanceof Element &&
                        e.target.closest('[data-peek-trigger]')
                    ) {
                        e.preventDefault();
                    }
                }}
            >
                {event && (
                    <>
                        <SheetHeader className="gap-3 pr-10">
                            <SheetTitle className="text-lg leading-snug">
                                {event.name}
                            </SheetTitle>
                            <div className="flex flex-wrap items-center gap-2">
                                <EventTimingBadge status={event.status} />
                                <EventLifecycleBadge
                                    published={event.is_published}
                                />
                            </div>
                            <SheetDescription className="sr-only">
                                Quick view of {event.name}
                            </SheetDescription>
                        </SheetHeader>

                        <EventBanner
                            banner={event.banner}
                            className="mx-4 h-56 shrink-0 rounded-lg border"
                        />

                        <div className="flex flex-col gap-4 p-4">
                            {event.description && (
                                <p className="text-sm leading-relaxed whitespace-pre-wrap text-muted-foreground">
                                    {event.description}
                                </p>
                            )}

                            <dl className="flex flex-col gap-3 border-t pt-4 text-sm">
                                <DetailRow icon={CalendarDays} label="Dates">
                                    {formatDate(event.start_date)} –{' '}
                                    {formatDate(event.end_date)}
                                </DetailRow>
                                <DetailRow icon={Tag} label="Category">
                                    {event.category ?? 'Uncategorised'}
                                </DetailRow>
                                <DetailRow icon={Phone} label="Contact">
                                    {event.contact_person}
                                </DetailRow>
                                <DetailRow icon={Users} label="Attendees">
                                    {event.attendees_count ?? 0}
                                </DetailRow>
                                <DetailRow icon={Ticket} label="Ticket types">
                                    {event.registration_categories_count ?? 0}
                                    {priceRange && (
                                        <span className="text-muted-foreground">
                                            {' '}
                                            · {priceRange}
                                        </span>
                                    )}
                                </DetailRow>
                            </dl>

                            <div className="flex items-center justify-between gap-3 rounded-lg border p-3">
                                <div>
                                    <p className="text-sm font-medium">
                                        Published
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        Visible on the public site
                                    </p>
                                </div>
                                <Switch
                                    checked={event.is_published}
                                    disabled={isPublicationPending}
                                    onCheckedChange={(checked) =>
                                        onTogglePublication(event, checked)
                                    }
                                    aria-label={`Publish ${event.name}`}
                                />
                            </div>

                            <div className="flex flex-col gap-2 border-t pt-4">
                                <Button
                                    variant="outline"
                                    className="justify-start"
                                    onClick={() =>
                                        copyRegistrationLink(event.id)
                                    }
                                >
                                    <Link2 className="mr-2 size-4" />
                                    Copy registration link
                                </Button>
                                <Button
                                    variant="outline"
                                    className="justify-start"
                                    asChild
                                >
                                    <a
                                        href={`/events/${event.id}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                    >
                                        <ExternalLink className="mr-2 size-4" />
                                        View public page
                                    </a>
                                </Button>
                                <Button
                                    variant="outline"
                                    className="justify-start"
                                    asChild
                                >
                                    <Link
                                        href={`/dashboard/events/${event.id}/attendees`}
                                    >
                                        <Users className="mr-2 size-4" />
                                        Attendees
                                    </Link>
                                </Button>
                                <Button
                                    variant="outline"
                                    className="justify-start"
                                    asChild
                                >
                                    <Link
                                        href={`/dashboard/events/${event.id}/registration-categories`}
                                    >
                                        <ClipboardList className="mr-2 size-4" />
                                        Registration categories
                                    </Link>
                                </Button>
                            </div>

                            <div className="flex gap-2 border-t pt-4">
                                <Button className="flex-1" asChild>
                                    <Link
                                        href={`/dashboard/events/${event.id}`}
                                    >
                                        <SquareArrowOutUpRight className="mr-2 size-4" />
                                        Open full page
                                    </Link>
                                </Button>
                                <Button variant="outline" asChild>
                                    <Link
                                        href={`/dashboard/events/${event.id}/edit`}
                                    >
                                        <Pencil className="mr-2 size-4" />
                                        Edit
                                    </Link>
                                </Button>
                            </div>
                        </div>
                    </>
                )}
            </SheetContent>
        </Sheet>
    );
}

function DetailRow({
    icon: Icon,
    label,
    children,
}: {
    icon: typeof Tag;
    label: string;
    children: React.ReactNode;
}) {
    return (
        <div className="flex items-start gap-3">
            <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
            <dt className="w-28 shrink-0 text-muted-foreground">{label}</dt>
            <dd className="min-w-0 flex-1">{children}</dd>
        </div>
    );
}
