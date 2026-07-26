import { Head, Link, router } from '@inertiajs/react';
import { ChevronLeft, PenSquare, Sparkles, Trash2, Users } from 'lucide-react';
import QRCode from 'qrcode';
import { useEffect, useMemo, useState } from 'react';
import { DeleteConfirmationDialog } from '@/components/delete-confirmation-dialog';
import { IdCardRenderer } from '@/components/id-card/id-card-renderer';
import type { IdCardData } from '@/components/id-card/id-card-renderer';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatImageUrl } from '@/lib/image-utils';
import type { AttendeeType } from '@/types/attendee-type';
import type { CardSubjectType, CardTemplate } from '@/types/card-template';
import type { Event } from '@/types/event';

type DefaultTemplate = Pick<CardTemplate, 'canvas' | 'elements'>;

interface Props {
    event: Event;
    templates: CardTemplate[];
    attendeeTypes: AttendeeType[];
    defaultTemplates: Record<CardSubjectType, DefaultTemplate>;
}

interface Row {
    key: string;
    label: string;
    caption: string;
    subjectType: CardSubjectType;
    attendeeTypeId: number | null;
    template: CardTemplate | undefined;
}

const THUMB_HEIGHT = 208;

export default function CardTemplatesIndex({ event, templates, attendeeTypes, defaultTemplates }: Props) {
    const [qrDataUrl, setQrDataUrl] = useState('');

    useEffect(() => {
        QRCode.toDataURL(`${window.location.origin}/attendees/preview/id-card`, {
            width: 240,
            margin: 1,
            errorCorrectionLevel: 'H',
        }).then(setQrDataUrl);
    }, []);

    const rows: Row[] = useMemo(
        () => [
            {
                key: 'attendee:all',
                label: 'All attendee types',
                caption: 'Used whenever a type has no design of its own',
                subjectType: 'attendee',
                attendeeTypeId: null,
                template: templates.find((t) => t.subject_type === 'attendee' && t.attendee_type_id === null),
            },
            ...attendeeTypes.map((type) => ({
                key: `attendee:${type.id}`,
                label: type.label,
                caption: `${type.attendees_count ?? 0} attendee${type.attendees_count === 1 ? '' : 's'}`,
                subjectType: 'attendee' as const,
                attendeeTypeId: type.id,
                template: templates.find((t) => t.subject_type === 'attendee' && t.attendee_type_id === type.id),
            })),
            {
                key: 'player',
                label: 'Players',
                caption: 'Tournament roster cards',
                subjectType: 'player',
                attendeeTypeId: null,
                template: templates.find((t) => t.subject_type === 'player'),
            },
            {
                key: 'team',
                label: 'Teams',
                caption: 'Team identity cards',
                subjectType: 'team',
                attendeeTypeId: null,
                template: templates.find((t) => t.subject_type === 'team'),
            },
        ],
        [templates, attendeeTypes],
    );

    const previewData: IdCardData = useMemo(
        () => ({
            name: 'Jane Doe',
            typeLabel: 'Guest',
            organization: 'Acme Corp',
            title: 'Booth 12',
            status: 'active',
            jerseyNumber: '23',
            teamName: 'Sample Team',
            categoryName: 'Open Division',
            qrDataUrl,
            eventName: event.name,
            eventLogo: event.logo ? formatImageUrl(event.logo) : undefined,
        }),
        [qrDataUrl, event.name, event.logo],
    );

    const customizedCount = templates.length;

    function handleDelete(templateId: number) {
        router.delete(`/dashboard/events/${event.id}/id-card-templates/${templateId}`, { preserveScroll: true });
    }

    function builderUrl(row: Row) {
        const params = new URLSearchParams({ subject_type: row.subjectType });

        if (row.attendeeTypeId) {
            params.set('attendee_type_id', String(row.attendeeTypeId));
        }

        return `/dashboard/events/${event.id}/id-card-templates/builder?${params}`;
    }

    return (
        <div className="mx-auto flex h-full w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-6 md:px-8 md:py-8">
            <Head title={`ID Card Templates · ${event.name}`} />

            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-4">
                    <Button variant="outline" size="icon" className="h-10 w-10 shrink-0" asChild>
                        <Link href={`/dashboard/events/${event.id}`} aria-label="Back to event">
                            <ChevronLeft className="h-5 w-5" />
                        </Link>
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">ID Card Designer</h1>
                        <p className="text-sm text-muted-foreground">
                            {event.name} · {customizedCount} custom {customizedCount === 1 ? 'design' : 'designs'}
                        </p>
                    </div>
                </div>

                <Button variant="outline" size="sm" asChild>
                    <Link href={`/dashboard/events/${event.id}/attendees`}>
                        <Users className="h-4 w-4" /> Manage attendees
                    </Link>
                </Button>
            </div>

            <p className="rounded-lg border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
                Each card type can have its own layout. Anything left on the default layout falls back to the built-in design, so
                every badge still prints correctly.
            </p>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {rows.map((row) => {
                    const design = row.template ?? defaultTemplates[row.subjectType];
                    const scale = design ? Math.min(THUMB_HEIGHT / design.canvas.height, 1) : 1;

                    return (
                        <div
                            key={row.key}
                            className="group flex flex-col overflow-hidden rounded-xl border bg-card transition-shadow hover:shadow-md"
                        >
                            <Link
                                href={builderUrl(row)}
                                className="flex items-center justify-center bg-muted/50 p-4"
                                style={{ height: THUMB_HEIGHT + 32 }}
                            >
                                {design ? (
                                    <IdCardRenderer
                                        template={design}
                                        data={previewData}
                                        scale={scale}
                                        className="rounded shadow-lg ring-1 ring-black/10 transition-transform group-hover:scale-[1.03]"
                                    />
                                ) : (
                                    <span className="text-xs text-muted-foreground">No preview</span>
                                )}
                            </Link>

                            <div className="flex flex-1 flex-col gap-3 border-t p-4">
                                <div className="flex items-start justify-between gap-2">
                                    <div className="min-w-0">
                                        <h2 className="truncate text-sm font-semibold">{row.label}</h2>
                                        <p className="truncate text-xs text-muted-foreground">{row.caption}</p>
                                    </div>
                                    {row.template ? (
                                        <Badge variant="secondary" className="shrink-0 gap-1">
                                            <Sparkles className="h-3 w-3" /> Custom
                                        </Badge>
                                    ) : (
                                        <Badge variant="outline" className="shrink-0">
                                            Default
                                        </Badge>
                                    )}
                                </div>

                                <div className="mt-auto flex items-center gap-2">
                                    <Button variant="outline" size="sm" className="flex-1" asChild>
                                        <Link href={builderUrl(row)}>
                                            <PenSquare className="h-4 w-4" />
                                            {row.template ? 'Edit design' : 'Start designing'}
                                        </Link>
                                    </Button>

                                    {row.template && (
                                        <DeleteConfirmationDialog
                                            title="Delete template?"
                                            description="This card type will fall back to the default layout."
                                            confirmationValue={row.template.name}
                                            onConfirm={() => handleDelete(row.template!.id as number)}
                                            trigger={
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    aria-label={`Delete ${row.label} template`}
                                                    className="text-muted-foreground hover:text-destructive"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            }
                                        />
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
