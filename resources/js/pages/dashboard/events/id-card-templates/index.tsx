import { Head, Link, router } from '@inertiajs/react';
import { ChevronLeft, PenSquare, Trash2 } from 'lucide-react';
import { DeleteConfirmationDialog } from '@/components/delete-confirmation-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { AttendeeType } from '@/types/attendee-type';
import type { CardTemplate } from '@/types/card-template';
import type { Event } from '@/types/event';

interface Props {
    event: Event;
    templates: CardTemplate[];
    attendeeTypes: AttendeeType[];
}

interface Row {
    key: string;
    label: string;
    subjectType: CardTemplate['subject_type'];
    attendeeTypeId: number | null;
    template: CardTemplate | undefined;
}

export default function CardTemplatesIndex({ event, templates, attendeeTypes }: Props) {
    const rows: Row[] = [
        { key: 'attendee:all', label: 'Attendees — all types (default)', subjectType: 'attendee', attendeeTypeId: null, template: templates.find((t) => t.subject_type === 'attendee' && t.attendee_type_id === null) },
        ...attendeeTypes.map((type) => ({
            key: `attendee:${type.id}`,
            label: `Attendees — ${type.label}`,
            subjectType: 'attendee' as const,
            attendeeTypeId: type.id,
            template: templates.find((t) => t.subject_type === 'attendee' && t.attendee_type_id === type.id),
        })),
        { key: 'player', label: 'Players', subjectType: 'player', attendeeTypeId: null, template: templates.find((t) => t.subject_type === 'player') },
        { key: 'team', label: 'Teams', subjectType: 'team', attendeeTypeId: null, template: templates.find((t) => t.subject_type === 'team') },
    ];

    function handleDelete(templateId: number) {
        router.delete(`/dashboard/events/${event.id}/id-card-templates/${templateId}`, { preserveScroll: true });
    }

    return (
        <div className="mx-auto flex h-full w-full max-w-4xl flex-1 flex-col gap-6 px-4 py-6 md:px-8 md:py-8">
            <Head title={`ID Card Templates · ${event.name}`} />

            <div className="flex items-center gap-4">
                <Button variant="outline" size="icon" className="h-10 w-10 shrink-0" asChild>
                    <Link href={`/dashboard/events/${event.id}`}>
                        <ChevronLeft className="h-5 w-5" />
                    </Link>
                </Button>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">ID Card Templates</h1>
                    <p className="text-sm text-muted-foreground">{event.name}</p>
                </div>
            </div>

            <div className="divide-y rounded-lg border">
                {rows.map((row) => (
                    <div key={row.key} className="flex items-center justify-between gap-4 px-4 py-3">
                        <div className="flex items-center gap-3">
                            <span className="text-sm font-medium">{row.label}</span>
                            {row.template ? <Badge variant="secondary">Customized</Badge> : <Badge variant="outline">Default layout</Badge>}
                        </div>

                        <div className="flex items-center gap-2">
                            <Button variant="outline" size="sm" asChild>
                                <Link
                                    href={`/dashboard/events/${event.id}/id-card-templates/builder?subject_type=${row.subjectType}${
                                        row.attendeeTypeId ? `&attendee_type_id=${row.attendeeTypeId}` : ''
                                    }`}
                                >
                                    <PenSquare className="mr-1 h-4 w-4" />
                                    {row.template ? 'Edit' : 'Design'}
                                </Link>
                            </Button>

                            {row.template && (
                                <DeleteConfirmationDialog
                                    title="Delete template?"
                                    description="This subject will fall back to the default layout."
                                    confirmationValue={row.template.name}
                                    onConfirm={() => handleDelete(row.template!.id as number)}
                                    trigger={
                                        <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive">
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    }
                                />
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
