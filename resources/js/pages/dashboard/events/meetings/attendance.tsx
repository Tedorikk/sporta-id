import { Head, Link, router } from '@inertiajs/react';
import { ChevronLeft, Circle, UserCheck, UserX } from 'lucide-react';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { Event } from '@/types/event';
import type { Meeting } from '@/types/meeting';
import type {
    MeetingCheckInMethod,
    MeetingCheckInStatus,
} from '@/types/meeting-check-in';

interface RosterRow {
    id: number;
    name: string;
    email: string | null;
    status: MeetingCheckInStatus | null;
    method: MeetingCheckInMethod | null;
}

interface Props {
    event: Event;
    meeting: Meeting;
    registrations: RosterRow[];
}

export default function MeetingAttendance({
    event,
    meeting,
    registrations,
}: Props) {
    const [savingId, setSavingId] = useState<number | null>(null);

    function mark(registrationId: number, status: MeetingCheckInStatus) {
        setSavingId(registrationId);

        router.put(
            `/dashboard/events/${event.id}/meetings/${meeting.id}/attendance`,
            { registration_id: registrationId, status },
            {
                preserveScroll: true,
                preserveState: true,
                onFinish: () => setSavingId(null),
            },
        );
    }

    const presentCount = registrations.filter(
        (r) => r.status === 'present',
    ).length;

    return (
        <div className="mx-auto flex h-full w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-6 md:px-8 md:py-8">
            <Head title={`Attendance · ${meeting.title}`} />

            <div className="flex items-center gap-4">
                <Button
                    variant="outline"
                    size="icon"
                    className="h-10 w-10 shrink-0"
                    asChild
                >
                    <Link
                        href={`/dashboard/events/${event.id}/meetings`}
                        aria-label="Back to meetings"
                    >
                        <ChevronLeft className="h-5 w-5" />
                    </Link>
                </Button>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">
                        {meeting.title}
                    </h1>
                    <p className="text-sm text-muted-foreground">
                        {event.name} · {presentCount} / {registrations.length}{' '}
                        present
                    </p>
                </div>
            </div>

            <div className="divide-y rounded-lg border">
                {registrations.length === 0 && (
                    <p className="px-4 py-8 text-center text-sm text-muted-foreground">
                        No confirmed individual registrations for this event
                        yet.
                    </p>
                )}

                {registrations.map((row) => (
                    <div
                        key={row.id}
                        className="flex items-center justify-between gap-4 px-4 py-3"
                    >
                        <div>
                            <p className="text-sm font-medium">{row.name}</p>
                            {row.email && (
                                <p className="text-xs text-muted-foreground">
                                    {row.email}
                                </p>
                            )}
                        </div>

                        <div className="flex items-center gap-2">
                            {row.method === 'qr' &&
                                row.status === 'present' && (
                                    <Badge
                                        variant="outline"
                                        className="text-xs"
                                    >
                                        via QR
                                    </Badge>
                                )}

                            <Button
                                variant={
                                    row.status === 'present'
                                        ? 'default'
                                        : 'outline'
                                }
                                size="sm"
                                disabled={savingId === row.id}
                                onClick={() => mark(row.id, 'present')}
                                className={cn(
                                    row.status === 'present' &&
                                        'bg-green-600 hover:bg-green-700',
                                )}
                            >
                                <UserCheck className="mr-2 h-4 w-4" />
                                Present
                            </Button>
                            <Button
                                variant={
                                    row.status === 'absent'
                                        ? 'default'
                                        : 'outline'
                                }
                                size="sm"
                                disabled={savingId === row.id}
                                onClick={() => mark(row.id, 'absent')}
                                className={cn(
                                    row.status === 'absent' &&
                                        'bg-red-600 hover:bg-red-700',
                                )}
                            >
                                <UserX className="mr-2 h-4 w-4" />
                                Absent
                            </Button>
                            {!row.status && (
                                <span className="flex items-center text-xs text-muted-foreground">
                                    <Circle className="mr-1 h-3 w-3" />
                                    Not marked
                                </span>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
