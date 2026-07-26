import type { FormDataConvertible } from '@inertiajs/core';
import { Head, Link, router } from '@inertiajs/react';
import { ChevronLeft, Image as ImageIcon, Plus, QrCode, Square, Trash2, Type } from 'lucide-react';
import QRCode from 'qrcode';
import { useEffect, useMemo, useState } from 'react';
import { makeDragHandlers, makeResizeHandlers } from '@/components/id-card/canvas-drag';
import type { Box, ResizeHandle } from '@/components/id-card/canvas-drag';
import { ElementContent } from '@/components/id-card/id-card-renderer';
import type { IdCardData } from '@/components/id-card/id-card-renderer';
import { Button } from '@/components/ui/button';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { formatImageUrl } from '@/lib/image-utils';
import type { Attendee } from '@/types/attendee';
import type { AttendeeType } from '@/types/attendee-type';
import type { CardElement, CardElementKind, CardSubjectType, CardTemplate } from '@/types/card-template';
import { BINDABLE_FIELDS } from '@/types/card-template';
import type { Event } from '@/types/event';

interface Props {
    event: Event;
    template: CardTemplate;
    subjectType: CardSubjectType;
    attendeeTypeId: number | null;
    attendeeTypes: AttendeeType[];
    sampleAttendee: Attendee | null;
}

const HANDLES: ResizeHandle[] = ['nw', 'ne', 'sw', 'se'];

const HANDLE_CURSOR: Record<ResizeHandle, string> = {
    nw: 'nwse-resize',
    se: 'nwse-resize',
    ne: 'nesw-resize',
    sw: 'nesw-resize',
};

const HANDLE_POSITION: Record<ResizeHandle, React.CSSProperties> = {
    nw: { top: -5, left: -5 },
    ne: { top: -5, right: -5 },
    sw: { bottom: -5, left: -5 },
    se: { bottom: -5, right: -5 },
};

function buildPreviewData(subjectType: CardSubjectType, sample: Attendee | null, qrDataUrl: string, event: Event): IdCardData {
    const eventLogo = event.logo ? formatImageUrl(event.logo) : undefined;

    if (subjectType === 'attendee') {
        return {
            name: sample?.name ?? 'Jane Doe',
            photo: sample?.photo ?? undefined,
            typeLabel: sample?.attendee_type?.label ?? 'Guest',
            organization: sample?.organization ?? 'Acme Corp',
            title: sample?.title ?? 'Booth 12',
            status: sample?.status ?? 'active',
            qrDataUrl,
            eventName: event.name,
            eventLogo,
        };
    }

    return {
        name: subjectType === 'team' ? 'Sample Team' : 'John Doe',
        photo: undefined,
        typeLabel: subjectType === 'team' ? undefined : 'Player',
        jerseyNumber: '23',
        teamName: 'Sample Team',
        qrDataUrl,
        eventName: event.name,
        eventLogo,
    };
}

function newElement(kind: CardElementKind, order: number): CardElement {
    const id = `el_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const base = {
        id,
        kind,
        x: 40,
        y: 40,
        rotation: 0,
        zIndex: order + 1,
    };

    if (kind === 'text') {
        return { ...base, binding: null, width: 220, height: 32, staticText: 'New text', style: { fontSize: 16, fontWeight: 400, textAlign: 'left', color: '#0f172a' } };
    }

    if (kind === 'qr') {
        return { ...base, binding: 'qrDataUrl', width: 160, height: 160, style: { borderRadius: 8, objectFit: 'cover' } };
    }

    if (kind === 'image') {
        return { ...base, binding: 'photo', width: 120, height: 120, style: { borderRadius: 12, objectFit: 'cover', background: '#e2e8f0' } };
    }

    return { ...base, binding: null, width: 340, height: 4, style: { background: '#e2e8f0' } };
}

export default function CardTemplateEdit({ event, template, subjectType, attendeeTypeId, attendeeTypes, sampleAttendee }: Props) {
    const [name, setName] = useState(template.name);
    const [canvas, setCanvas] = useState(template.canvas);
    const [elements, setElements] = useState<CardElement[]>(template.elements);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [qrPreview, setQrPreview] = useState('');
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        QRCode.toDataURL(`${window.location.origin}/attendees/preview/id-card`, {
            width: 200,
            margin: 1,
            errorCorrectionLevel: 'H',
        }).then(setQrPreview);
    }, []);

    const previewData = useMemo(
        () => buildPreviewData(subjectType, sampleAttendee, qrPreview, event),
        [subjectType, sampleAttendee, qrPreview, event],
    );

    const selected = elements.find((el) => el.id === selectedId) ?? null;
    const bindableFields = BINDABLE_FIELDS[subjectType];

    function updateElement(id: string, patch: Partial<CardElement>) {
        setElements((prev) => prev.map((el) => (el.id === id ? { ...el, ...patch } : el)));
    }

    function addElement(kind: CardElementKind) {
        const element = newElement(kind, elements.length);
        setElements((prev) => [...prev, element]);
        setSelectedId(element.id);
    }

    function removeElement(id: string) {
        setElements((prev) => prev.filter((el) => el.id !== id));

        if (selectedId === id) {
            setSelectedId(null);
        }
    }

    function switchContext(nextSubjectType: CardSubjectType, nextAttendeeTypeId: number | null) {
        router.get(
            `/dashboard/events/${event.id}/id-card-templates/builder`,
            { subject_type: nextSubjectType, attendee_type_id: nextAttendeeTypeId ?? undefined },
            { preserveState: false },
        );
    }

    function handleSave() {
        setSaving(true);

        // Cast: canvas/elements are plain JSON-serializable objects, but their
        // literal-union style types don't structurally satisfy Inertia's
        // FormDataConvertible index signature.
        const payload = {
            subject_type: subjectType,
            attendee_type_id: attendeeTypeId,
            name,
            canvas,
            elements,
        } as unknown as Record<string, FormDataConvertible>;

        const onFinish = () => setSaving(false);

        if (template.id) {
            router.put(`/dashboard/events/${event.id}/id-card-templates/${template.id}`, payload, { onFinish, preserveScroll: true });
        } else {
            router.post(`/dashboard/events/${event.id}/id-card-templates`, payload, { onFinish, preserveScroll: true });
        }
    }

    return (
        <div className="mx-auto flex h-full w-full max-w-7xl flex-1 flex-col gap-6 px-4 py-6 md:px-8 md:py-8">
            <Head title={`Card Designer · ${event.name}`} />

            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-4">
                    <Button variant="outline" size="icon" className="h-10 w-10 shrink-0" asChild>
                        <Link href={`/dashboard/events/${event.id}/id-card-templates`}>
                            <ChevronLeft className="h-5 w-5" />
                        </Link>
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">ID Card Designer</h1>
                        <p className="text-sm text-muted-foreground">{event.name}</p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <Select
                        value={attendeeTypeId ? `attendee:${attendeeTypeId}` : subjectType === 'attendee' ? 'attendee:all' : subjectType}
                        onValueChange={(value) => {
                            if (value === 'attendee:all') {
                                switchContext('attendee', null);
                            } else if (value.startsWith('attendee:')) {
                                switchContext('attendee', Number(value.split(':')[1]));
                            } else {
                                switchContext(value as CardSubjectType, null);
                            }
                        }}
                    >
                        <SelectTrigger className="w-56">
                            <SelectValue placeholder="Card type" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="attendee:all">Attendees — all types (default)</SelectItem>
                            {attendeeTypes.map((type) => (
                                <SelectItem key={type.id} value={`attendee:${type.id}`}>
                                    Attendees — {type.label}
                                </SelectItem>
                            ))}
                            <SelectItem value="player">Players</SelectItem>
                            <SelectItem value="team">Teams</SelectItem>
                        </SelectContent>
                    </Select>

                    <Button onClick={handleSave} disabled={saving}>
                        {saving ? 'Saving…' : 'Save template'}
                    </Button>
                </div>
            </div>

            <div className="grid flex-1 grid-cols-1 gap-6 lg:grid-cols-[220px_1fr_300px]">
                {/* Elements toolbar */}
                <div className="flex flex-col gap-4">
                    <FieldGroup>
                        <Field>
                            <FieldLabel htmlFor="template-name">Template name</FieldLabel>
                            <Input id="template-name" value={name} onChange={(e) => setName(e.target.value)} />
                        </Field>
                    </FieldGroup>

                    <div className="rounded-lg border p-3">
                        <p className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">Add element</p>
                        <div className="grid grid-cols-2 gap-2">
                            <Button variant="outline" size="sm" onClick={() => addElement('text')}>
                                <Type className="mr-1 h-4 w-4" /> Text
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => addElement('image')}>
                                <ImageIcon className="mr-1 h-4 w-4" /> Image
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => addElement('qr')}>
                                <QrCode className="mr-1 h-4 w-4" /> QR
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => addElement('shape')}>
                                <Square className="mr-1 h-4 w-4" /> Shape
                            </Button>
                        </div>
                    </div>

                    <div className="rounded-lg border p-3">
                        <p className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">Layers</p>
                        <div className="flex flex-col gap-1">
                            {elements.length === 0 && <p className="text-sm text-muted-foreground">No elements yet.</p>}
                            {[...elements]
                                .sort((a, b) => b.zIndex - a.zIndex)
                                .map((el) => (
                                    <button
                                        key={el.id}
                                        onClick={() => setSelectedId(el.id)}
                                        className={`flex items-center justify-between rounded-md px-2 py-1.5 text-left text-sm ${
                                            selectedId === el.id ? 'bg-primary/10 text-primary' : 'hover:bg-muted'
                                        }`}
                                    >
                                        <span className="truncate capitalize">
                                            {el.kind}
                                            {el.binding ? ` · ${el.binding}` : ''}
                                        </span>
                                        <Trash2
                                            className="h-3.5 w-3.5 shrink-0 text-muted-foreground hover:text-destructive"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                removeElement(el.id);
                                            }}
                                        />
                                    </button>
                                ))}
                        </div>
                    </div>
                </div>

                {/* Canvas */}
                <div className="flex items-start justify-center overflow-auto rounded-lg border bg-muted/30 p-8">
                    <div
                        onPointerDown={() => setSelectedId(null)}
                        style={{
                            position: 'relative',
                            width: canvas.width,
                            height: canvas.height,
                            background: canvas.background || '#ffffff',
                            boxShadow: '0 10px 30px rgba(0,0,0,0.15)',
                        }}
                    >
                        {elements.map((el) => {
                            const drag = makeDragHandlers(
                                () => ({ x: el.x, y: el.y, width: el.width, height: el.height }),
                                (box: Box) => updateElement(el.id, box),
                            );

                            return (
                                <div
                                    key={el.id}
                                    onPointerDown={(e) => {
                                        setSelectedId(el.id);
                                        drag.onPointerDown(e);
                                    }}
                                    onPointerMove={drag.onPointerMove}
                                    onPointerUp={drag.onPointerUp}
                                    style={{
                                        position: 'absolute',
                                        left: el.x,
                                        top: el.y,
                                        width: el.width,
                                        height: el.height,
                                        zIndex: el.zIndex,
                                        cursor: 'move',
                                        outline: selectedId === el.id ? '2px solid #2563eb' : '1px dashed transparent',
                                    }}
                                >
                                    <ElementContent element={el} data={previewData} />

                                    {selectedId === el.id &&
                                        HANDLES.map((handle) => {
                                            const resize = makeResizeHandlers(
                                                () => ({ x: el.x, y: el.y, width: el.width, height: el.height }),
                                                handle,
                                                (box: Box) => updateElement(el.id, box),
                                            );

                                            return (
                                                <div
                                                    key={handle}
                                                    onPointerDown={resize.onPointerDown}
                                                    onPointerMove={resize.onPointerMove}
                                                    onPointerUp={resize.onPointerUp}
                                                    style={{
                                                        position: 'absolute',
                                                        width: 10,
                                                        height: 10,
                                                        borderRadius: 9999,
                                                        background: '#2563eb',
                                                        border: '2px solid white',
                                                        cursor: HANDLE_CURSOR[handle],
                                                        ...HANDLE_POSITION[handle],
                                                    }}
                                                />
                                            );
                                        })}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Properties panel */}
                <div className="rounded-lg border p-3">
                    {!selected ? (
                        <p className="text-sm text-muted-foreground">Select an element to edit its properties, or add a new one from the left panel.</p>
                    ) : (
                        <FieldGroup>
                            <Field>
                                <FieldLabel>Bind to data</FieldLabel>
                                <Select
                                    value={selected.binding ?? '__static__'}
                                    onValueChange={(value) => updateElement(selected.id, { binding: value === '__static__' ? null : value })}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="__static__">— Static content —</SelectItem>
                                        {bindableFields
                                            .filter((f) => (selected.kind === 'image' || selected.kind === 'qr' ? f.value === 'photo' || f.value === 'qrDataUrl' || f.value === 'eventLogo' : f.value !== 'photo' && f.value !== 'qrDataUrl' && f.value !== 'eventLogo'))
                                            .map((f) => (
                                                <SelectItem key={f.value} value={f.value}>
                                                    {f.label}
                                                </SelectItem>
                                            ))}
                                    </SelectContent>
                                </Select>
                            </Field>

                            {!selected.binding && selected.kind === 'text' && (
                                <Field>
                                    <FieldLabel>Static text</FieldLabel>
                                    <Textarea
                                        value={selected.staticText ?? ''}
                                        onChange={(e) => updateElement(selected.id, { staticText: e.target.value })}
                                        rows={2}
                                    />
                                </Field>
                            )}

                            {!selected.binding && (selected.kind === 'image' || selected.kind === 'qr') && (
                                <Field>
                                    <FieldLabel>Static image URL</FieldLabel>
                                    <Input
                                        value={selected.staticImageUrl ?? ''}
                                        onChange={(e) => updateElement(selected.id, { staticImageUrl: e.target.value })}
                                    />
                                </Field>
                            )}

                            <div className="grid grid-cols-2 gap-2">
                                <Field>
                                    <FieldLabel>X</FieldLabel>
                                    <Input type="number" value={Math.round(selected.x)} onChange={(e) => updateElement(selected.id, { x: Number(e.target.value) })} />
                                </Field>
                                <Field>
                                    <FieldLabel>Y</FieldLabel>
                                    <Input type="number" value={Math.round(selected.y)} onChange={(e) => updateElement(selected.id, { y: Number(e.target.value) })} />
                                </Field>
                                <Field>
                                    <FieldLabel>Width</FieldLabel>
                                    <Input type="number" value={Math.round(selected.width)} onChange={(e) => updateElement(selected.id, { width: Number(e.target.value) })} />
                                </Field>
                                <Field>
                                    <FieldLabel>Height</FieldLabel>
                                    <Input type="number" value={Math.round(selected.height)} onChange={(e) => updateElement(selected.id, { height: Number(e.target.value) })} />
                                </Field>
                            </div>

                            {selected.kind === 'text' && (
                                <>
                                    <div className="grid grid-cols-2 gap-2">
                                        <Field>
                                            <FieldLabel>Font size</FieldLabel>
                                            <Input
                                                type="number"
                                                value={selected.style.fontSize ?? 14}
                                                onChange={(e) => updateElement(selected.id, { style: { ...selected.style, fontSize: Number(e.target.value) } })}
                                            />
                                        </Field>
                                        <Field>
                                            <FieldLabel>Align</FieldLabel>
                                            <Select
                                                value={selected.style.textAlign ?? 'left'}
                                                onValueChange={(value) => updateElement(selected.id, { style: { ...selected.style, textAlign: value as 'left' | 'center' | 'right' } })}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="left">Left</SelectItem>
                                                    <SelectItem value="center">Center</SelectItem>
                                                    <SelectItem value="right">Right</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </Field>
                                    </div>
                                    <Field>
                                        <FieldLabel>Color</FieldLabel>
                                        <Input
                                            type="color"
                                            value={selected.style.color ?? '#0f172a'}
                                            onChange={(e) => updateElement(selected.id, { style: { ...selected.style, color: e.target.value } })}
                                        />
                                    </Field>
                                </>
                            )}

                            {(selected.kind === 'image' || selected.kind === 'qr' || selected.kind === 'shape') && (
                                <Field>
                                    <FieldLabel>Border radius</FieldLabel>
                                    <Input
                                        type="number"
                                        value={selected.style.borderRadius ?? 0}
                                        onChange={(e) => updateElement(selected.id, { style: { ...selected.style, borderRadius: Number(e.target.value) } })}
                                    />
                                </Field>
                            )}

                            {selected.kind === 'shape' && (
                                <Field>
                                    <FieldLabel>Background</FieldLabel>
                                    <Input
                                        type="color"
                                        value={selected.style.background ?? '#e2e8f0'}
                                        onChange={(e) => updateElement(selected.id, { style: { ...selected.style, background: e.target.value } })}
                                    />
                                </Field>
                            )}

                            <Button variant="destructive" size="sm" onClick={() => removeElement(selected.id)}>
                                <Trash2 className="mr-1 h-4 w-4" /> Delete element
                            </Button>
                        </FieldGroup>
                    )}

                    <div className="mt-4 border-t pt-3">
                        <FieldLabel>Canvas background</FieldLabel>
                        <Input
                            type="color"
                            value={canvas.background || '#ffffff'}
                            onChange={(e) => setCanvas({ ...canvas, background: e.target.value })}
                        />
                    </div>
                </div>
            </div>

            <p className="text-xs text-muted-foreground">
                <Plus className="mr-1 inline h-3 w-3" />
                Drag elements to move them, drag the blue corner handles to resize.
            </p>
        </div>
    );
}
