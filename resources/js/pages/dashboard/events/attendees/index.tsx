import { Head, Link, router } from '@inertiajs/react';
import {
    AlertCircle,
    ChevronLeft,
    ExternalLink,
    Palette,
    Pencil,
    Plus,
    Search,
    Tags,
    Trash2,
    Users,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { DeleteConfirmationDialog } from '@/components/delete-confirmation-dialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import type { AttendeeStatus, PaginatedAttendees } from '@/types/attendee';
import type { AttendeeType } from '@/types/attendee-type';
import type { Event } from '@/types/event';
import { AttendeeFormDialog } from './components/attendee-form-dialog';

interface Props {
    event: Event;
    attendees: PaginatedAttendees;
    attendeeTypes: AttendeeType[];
    filters: {
        search?: string;
        type?: string;
        status?: string;
    };
}

const STATUS_VARIANT: Record<AttendeeStatus, 'default' | 'destructive'> = {
    active: 'default',
    revoked: 'destructive',
};

function EmptyState() {
    return (
        <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed py-14 text-center">
            <Users className="h-6 w-6 text-muted-foreground" />
            <p className="text-sm font-medium">No attendees found</p>
            <p className="max-w-sm text-sm text-muted-foreground">
                Add a guest, tenant, photographer, or any other attendee type to
                issue them an ID card.
            </p>
        </div>
    );
}

export default function AttendeesIndex({
    event,
    attendees,
    attendeeTypes,
    filters,
}: Props) {
    const [search, setSearch] = useState(filters.search ?? '');

    useEffect(() => {
        const timeout = setTimeout(() => {
            if (search === (filters.search ?? '')) {
                return;
            }

            applyFilters({ search: search || undefined });
        }, 400);

        return () => clearTimeout(timeout);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [search]);

    function applyFilters(next: Partial<Props['filters']>) {
        router.get(
            `/dashboard/events/${event.id}/attendees`,
            { ...filters, ...next },
            { preserveScroll: true, preserveState: true, replace: true },
        );
    }

    function handleDelete(attendeeId: number) {
        router.delete(`/dashboard/events/${event.id}/attendees/${attendeeId}`, {
            preserveScroll: true,
        });
    }

    return (
        <div className="mx-auto flex h-full w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-6 md:px-8 md:py-8">
            <Head title={`Attendees · ${event.name}`} />

            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-4">
                    <Button
                        variant="outline"
                        size="icon"
                        className="h-10 w-10 shrink-0"
                        asChild
                    >
                        <Link href={`/dashboard/events/${event.id}`}>
                            <ChevronLeft className="h-5 w-5" />
                        </Link>
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">
                            Attendees
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            {event.name}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <Button variant="outline" asChild>
                        <Link
                            href={`/dashboard/events/${event.id}/attendee-types`}
                        >
                            <Tags className="mr-2 h-4 w-4" />
                            Attendee Types
                        </Link>
                    </Button>

                    <Button variant="outline" asChild>
                        <Link
                            href={`/dashboard/events/${event.id}/id-card-templates`}
                        >
                            <Palette className="mr-2 h-4 w-4" />
                            Card Designer
                        </Link>
                    </Button>

                    <AttendeeFormDialog
                        event={event}
                        attendeeTypes={attendeeTypes}
                        trigger={
                            <Button disabled={attendeeTypes.length === 0}>
                                <Plus className="mr-2 h-4 w-4" />
                                Add Attendee
                            </Button>
                        }
                    />
                </div>
            </div>

            {attendeeTypes.length === 0 && (
                <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>No Attendee Types Configured</AlertTitle>
                    <AlertDescription>
                        <span className="inline">
                            You need at least one attendee type (like Guest,
                            Tenant, or Photographer) before you can add
                            attendees. Set them up on the{' '}
                            <Link
                                href={`/dashboard/events/${event.id}/attendee-types`}
                                className="inline font-semibold underline"
                            >
                                Attendee Types
                            </Link>{' '}
                            page.
                        </span>
                    </AlertDescription>
                </Alert>
            )}

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="relative flex-1">
                    <Search className="absolute top-2.5 left-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search by name..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-8"
                    />
                </div>

                <Select
                    value={filters.type ?? 'all'}
                    onValueChange={(value) =>
                        applyFilters({
                            type: value === 'all' ? undefined : value,
                        })
                    }
                >
                    <SelectTrigger className="w-full sm:w-48">
                        <SelectValue placeholder="All types" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All types</SelectItem>
                        {attendeeTypes.map((type) => (
                            <SelectItem
                                key={type.id}
                                value={type.id.toString()}
                            >
                                {type.label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                <Select
                    value={filters.status ?? 'all'}
                    onValueChange={(value) =>
                        applyFilters({
                            status: value === 'all' ? undefined : value,
                        })
                    }
                >
                    <SelectTrigger className="w-full sm:w-40">
                        <SelectValue placeholder="All statuses" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All statuses</SelectItem>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="revoked">Revoked</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {attendees.data.length === 0 ? (
                <EmptyState />
            ) : (
                <div className="divide-y rounded-lg border">
                    {attendees.data.map((attendee) => (
                        <div
                            key={attendee.id}
                            className="flex items-center justify-between gap-4 px-4 py-3"
                        >
                            <div className="flex min-w-0 items-center gap-3">
                                {attendee.photo ? (
                                    <img
                                        src={attendee.photo}
                                        alt={attendee.name}
                                        className="h-10 w-10 shrink-0 rounded-full object-cover"
                                    />
                                ) : (
                                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-semibold text-muted-foreground">
                                        {attendee.name
                                            .substring(0, 2)
                                            .toUpperCase()}
                                    </div>
                                )}
                                <div className="min-w-0">
                                    <p className="truncate text-sm font-medium">
                                        {attendee.name}
                                    </p>
                                    <p className="truncate text-xs text-muted-foreground">
                                        {attendee.attendee_type?.label}
                                        {attendee.organization
                                            ? ` · ${attendee.organization}`
                                            : ''}
                                    </p>
                                </div>
                            </div>

                            <div className="flex shrink-0 items-center gap-2">
                                <Badge
                                    variant={STATUS_VARIANT[attendee.status]}
                                >
                                    {attendee.status}
                                </Badge>

                                <Button variant="ghost" size="icon" asChild>
                                    <a
                                        href={`/attendees/${attendee.id}/id-card`}
                                        target="_blank"
                                        rel="noreferrer"
                                    >
                                        <ExternalLink className="h-4 w-4" />
                                    </a>
                                </Button>

                                <AttendeeFormDialog
                                    event={event}
                                    attendee={attendee}
                                    attendeeTypes={attendeeTypes}
                                    trigger={
                                        <Button variant="ghost" size="icon">
                                            <Pencil className="h-4 w-4" />
                                        </Button>
                                    }
                                />

                                <DeleteConfirmationDialog
                                    title="Delete attendee?"
                                    confirmationValue={attendee.name}
                                    onConfirm={() => handleDelete(attendee.id)}
                                    trigger={
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="text-muted-foreground hover:text-destructive"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    }
                                />
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
