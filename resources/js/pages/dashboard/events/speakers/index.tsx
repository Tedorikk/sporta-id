import { Head, Link, router } from '@inertiajs/react';
import { ChevronLeft, Pencil, Plus, Trash2 } from 'lucide-react';
import { DeleteConfirmationDialog } from '@/components/delete-confirmation-dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { formatImageUrl } from '@/lib/image-utils';
import type { Event } from '@/types/event';
import type { Speaker } from '@/types/speaker';
import { SpeakerFormDialog } from './components/speaker-form-dialog';

interface Props {
    event: Event;
    speakers: Speaker[];
}

export default function SpeakersIndex({ event, speakers }: Props) {
    function handleDelete(id: number) {
        router.delete(`/dashboard/events/${event.id}/speakers/${id}`, { preserveScroll: true });
    }

    return (
        <div className="mx-auto flex h-full w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-6 md:px-8 md:py-8">
            <Head title={`Speakers · ${event.name}`} />

            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-4">
                    <Button variant="outline" size="icon" className="h-10 w-10 shrink-0" asChild>
                        <Link href={`/dashboard/events/${event.id}`} aria-label="Back to event">
                            <ChevronLeft className="h-5 w-5" />
                        </Link>
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Speakers</h1>
                        <p className="text-sm text-muted-foreground">{event.name} · Reusable across meetings for this event.</p>
                    </div>
                </div>

                <SpeakerFormDialog
                    event={event}
                    trigger={
                        <Button>
                            <Plus className="mr-2 h-4 w-4" />
                            Add Speaker
                        </Button>
                    }
                />
            </div>

            <div className="divide-y rounded-lg border">
                {speakers.length === 0 && (
                    <p className="px-4 py-8 text-center text-sm text-muted-foreground">No speakers yet. Add one to assign to meetings.</p>
                )}

                {speakers.map((speaker) => (
                    <div key={speaker.id} className="flex items-center justify-between gap-4 px-4 py-3">
                        <div className="flex items-center gap-3">
                            <Avatar>
                                <AvatarImage src={speaker.photo ? formatImageUrl(speaker.photo) : undefined} alt={speaker.name} />
                                <AvatarFallback>{speaker.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                            </Avatar>
                            <div>
                                <p className="text-sm font-medium">{speaker.name}</p>
                                {speaker.title && <p className="text-xs text-muted-foreground">{speaker.title}</p>}
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">{speaker.meetings_count ?? 0} meeting(s)</span>

                            <SpeakerFormDialog
                                event={event}
                                speaker={speaker}
                                trigger={
                                    <Button variant="ghost" size="icon">
                                        <Pencil className="h-4 w-4" />
                                    </Button>
                                }
                            />

                            <DeleteConfirmationDialog
                                title="Delete speaker?"
                                description={
                                    (speaker.meetings_count ?? 0) > 0
                                        ? 'This speaker still has meetings assigned to them and cannot be deleted.'
                                        : undefined
                                }
                                confirmationValue={speaker.name}
                                onConfirm={() => handleDelete(speaker.id)}
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
