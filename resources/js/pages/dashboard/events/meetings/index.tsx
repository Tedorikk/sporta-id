import { Head, Link, router } from '@inertiajs/react';
import { ChevronLeft, ClipboardCheck, Pencil, Plus, Trash2 } from 'lucide-react';
import { DeleteConfirmationDialog } from '@/components/delete-confirmation-dialog';
import { Button } from '@/components/ui/button';
import { formatDateTime } from '@/lib/format-date';
import type { Event } from '@/types/event';
import type { Meeting } from '@/types/meeting';
import type { Speaker } from '@/types/speaker';
import { MeetingFormDialog } from './components/meeting-form-dialog';

interface Props {
    event: Event;
    meetings: Meeting[];
    speakers: Speaker[];
}

function formatMeetingTime(meeting: Meeting) {
    const start = formatDateTime(meeting.scheduled_at);

    if (!meeting.ends_at) {
        return start;
    }

    return `${start} – ${formatDateTime(meeting.ends_at)}`;
}

export default function MeetingsIndex({ event, meetings, speakers }: Props) {
    function handleDelete(id: number) {
        router.delete(`/dashboard/events/${event.id}/meetings/${id}`, { preserveScroll: true });
    }

    return (
        <div className="mx-auto flex h-full w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-6 md:px-8 md:py-8">
            <Head title={`Meetings · ${event.name}`} />

            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-4">
                    <Button variant="outline" size="icon" className="h-10 w-10 shrink-0" asChild>
                        <Link href={`/dashboard/events/${event.id}`} aria-label="Back to event">
                            <ChevronLeft className="h-5 w-5" />
                        </Link>
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Meetings</h1>
                        <p className="text-sm text-muted-foreground">{event.name} · The schedule attendees check into.</p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <Button variant="outline" asChild>
                        <Link href={`/dashboard/events/${event.id}/speakers`}>Manage Speakers</Link>
                    </Button>
                    <MeetingFormDialog
                        event={event}
                        speakers={speakers}
                        trigger={
                            <Button>
                                <Plus className="mr-2 h-4 w-4" />
                                Add Meeting
                            </Button>
                        }
                    />
                </div>
            </div>

            <div className="divide-y rounded-lg border">
                {meetings.length === 0 && (
                    <p className="px-4 py-8 text-center text-sm text-muted-foreground">
                        No meetings yet. Add one to start building this event's schedule.
                    </p>
                )}

                {meetings.map((meeting) => (
                    <div key={meeting.id} className="flex items-center justify-between gap-4 px-4 py-3">
                        <div>
                            <p className="text-sm font-medium">{meeting.title}</p>
                            <p className="text-xs text-muted-foreground">
                                {formatMeetingTime(meeting)}
                                {meeting.location ? ` · ${meeting.location}` : ''}
                                {meeting.speaker ? ` · ${meeting.speaker.name}` : ''}
                            </p>
                        </div>

                        <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">{meeting.check_ins_count ?? 0} checked in</span>

                            <Button variant="outline" size="sm" asChild>
                                <Link href={`/dashboard/events/${event.id}/meetings/${meeting.id}/attendance`}>
                                    <ClipboardCheck className="mr-2 h-4 w-4" />
                                    Attendance
                                </Link>
                            </Button>

                            <MeetingFormDialog
                                event={event}
                                speakers={speakers}
                                meeting={meeting}
                                trigger={
                                    <Button variant="ghost" size="icon">
                                        <Pencil className="h-4 w-4" />
                                    </Button>
                                }
                            />

                            <DeleteConfirmationDialog
                                title="Delete meeting?"
                                confirmationValue={meeting.title}
                                onConfirm={() => handleDelete(meeting.id)}
                                trigger={
                                    <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive">
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                }
                            />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
