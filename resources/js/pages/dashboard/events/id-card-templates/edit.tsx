import type { FormDataConvertible } from '@inertiajs/core';
import { Head, Link, router } from '@inertiajs/react';
import {
    ChevronLeft,
    Grid3x3,
    Image as ImageIcon,
    Keyboard,
    Loader2,
    Magnet,
    Maximize2,
    Minus,
    Plus,
    QrCode,
    Redo2,
    RotateCcw,
    Save,
    Square,
    Type,
    Undo2,
} from 'lucide-react';
import QRCode from 'qrcode';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Box } from '@/components/id-card/canvas-geometry';
import {
    APP_LOGO_URL,
    rescaleElements,
    SUBJECT_LABEL,
} from '@/components/id-card/card-presets';
import { DesignCanvas } from '@/components/id-card/design-canvas';
import type { IdCardData } from '@/components/id-card/id-card-renderer';
import { formDataBindings } from '@/components/id-card/id-card-renderer';
import { InspectorPanel } from '@/components/id-card/inspector-panel';
import { LayersPanel } from '@/components/id-card/layers-panel';
import {
    normalizeElement,
    useCardDesigner,
} from '@/components/id-card/use-card-designer';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectLabel,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { formatImageUrl } from '@/lib/image-utils';
import { cn } from '@/lib/utils';
import type { Attendee } from '@/types/attendee';
import type { AttendeeType } from '@/types/attendee-type';
import type {
    BindableField,
    CardElementKind,
    CardSubjectType,
    CardTemplate,
} from '@/types/card-template';
import { BINDABLE_FIELDS } from '@/types/card-template';
import type { Event } from '@/types/event';
import type { Registration } from '@/types/registration';
import type { RegistrationCategory } from '@/types/registration-category';

interface Props {
    event: Event;
    template: CardTemplate;
    subjectType: CardSubjectType;
    attendeeTypeId: number | null;
    registrationCategoryId: number | null;
    attendeeTypes: AttendeeType[];
    registrationCategories: RegistrationCategory[];
    sampleAttendee: Attendee | null;
    sampleRegistration: Registration | null;
    defaultTemplate: Pick<CardTemplate, 'canvas' | 'elements'>;
    errors?: Record<string, string>;
}

const ZOOM_STEPS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2, 3];

/** Mirrors RegistrationController::RESERVED_KEYS — these already have dedicated fixed bindings. */
const RESERVED_FIELD_KEYS = ['name', 'email', 'phone', 'photo'];

const ADD_BUTTONS: {
    kind: CardElementKind;
    label: string;
    icon: typeof Type;
}[] = [
    { kind: 'text', label: 'Text', icon: Type },
    { kind: 'image', label: 'Image', icon: ImageIcon },
    { kind: 'qr', label: 'QR', icon: QrCode },
    { kind: 'shape', label: 'Shape', icon: Square },
];

const SHORTCUTS: [string, string][] = [
    ['Drag', 'Move layer'],
    ['Shift + drag handle', 'Resize proportionally'],
    ['Alt + drag', 'Ignore snapping'],
    ['Arrows', 'Nudge 1px'],
    ['Shift + arrows', 'Nudge 10px'],
    ['Ctrl/⌘ + D', 'Duplicate'],
    ['Ctrl/⌘ + Z', 'Undo'],
    ['Ctrl/⌘ + Shift + Z', 'Redo'],
    ['Ctrl/⌘ + S', 'Save'],
    ['Delete', 'Remove layer'],
    ['Esc', 'Deselect'],
];

function buildPreviewData(
    subjectType: CardSubjectType,
    sample: Attendee | null,
    sampleRegistration: Registration | null,
    qrDataUrl: string,
    event: Event,
): IdCardData {
    const eventLogo = event.logo ? formatImageUrl(event.logo) : undefined;

    if (subjectType === 'attendee') {
        return {
            name: sample?.name ?? 'Jane Doe',
            photo: sample?.photo ? formatImageUrl(sample.photo) : undefined,
            typeLabel: sample?.attendee_type?.label ?? 'Guest',
            organization: sample?.organization ?? 'Acme Corp',
            title: sample?.title ?? 'Booth 12',
            status: sample?.status ?? 'active',
            qrDataUrl,
            eventName: event.name,
            eventLogo,
            appLogo: APP_LOGO_URL,
        };
    }

    if (subjectType === 'registration') {
        return {
            name: sampleRegistration?.name ?? 'Jane Doe',
            photo: sampleRegistration?.photo
                ? formatImageUrl(sampleRegistration.photo)
                : undefined,
            typeLabel:
                sampleRegistration?.registration_category?.name ??
                'Sample Category',
            email: sampleRegistration?.email ?? undefined,
            phone: sampleRegistration?.phone ?? undefined,
            qrDataUrl,
            eventName: event.name,
            eventLogo,
            appLogo: APP_LOGO_URL,
            ...formDataBindings(sampleRegistration?.form_data),
        };
    }

    return {
        name: subjectType === 'team' ? 'Sample Team' : 'John Doe',
        photo: undefined,
        typeLabel: subjectType === 'team' ? undefined : 'Player',
        jerseyNumber: '23',
        teamName: 'Sample Team',
        categoryName: 'Open Division',
        qrDataUrl,
        eventName: event.name,
        eventLogo,
        appLogo: APP_LOGO_URL,
    };
}

function contextValue(
    subjectType: CardSubjectType,
    attendeeTypeId: number | null,
    registrationCategoryId: number | null,
): string {
    if (subjectType === 'attendee') {
        return attendeeTypeId ? `attendee:${attendeeTypeId}` : 'attendee:all';
    }

    if (subjectType === 'registration') {
        return registrationCategoryId
            ? `registration:${registrationCategoryId}`
            : 'registration:all';
    }

    return subjectType;
}

export default function CardTemplateEdit({
    event,
    template,
    subjectType,
    attendeeTypeId,
    registrationCategoryId,
    attendeeTypes,
    registrationCategories,
    sampleAttendee,
    sampleRegistration,
    defaultTemplate,
    errors,
}: Props) {
    const [name, setName] = useState(template.name);
    const [qrPreview, setQrPreview] = useState('');
    const [saving, setSaving] = useState(false);
    const [zoom, setZoom] = useState(1);
    const [showGrid, setShowGrid] = useState(false);
    const [snapEnabled, setSnapEnabled] = useState(true);
    const viewportRef = useRef<HTMLDivElement>(null);

    const designer = useCardDesigner(
        useMemo(
            () => ({
                canvas: template.canvas,
                elements: (template.elements ?? []).map(normalizeElement),
            }),
            // Re-seeded by a full page visit when the context changes, so a
            // one-shot initial value is exactly what we want here.
            // eslint-disable-next-line react-hooks/exhaustive-deps
            [],
        ),
    );

    const { canvas, elements, selectedIds, setSelectedIds, selected, isDirty } =
        designer;

    useEffect(() => {
        QRCode.toDataURL(
            `${window.location.origin}/attendees/preview/id-card`,
            {
                width: 320,
                margin: 1,
                errorCorrectionLevel: 'H',
            },
        ).then(setQrPreview);
    }, []);

    const previewData = useMemo(
        () =>
            buildPreviewData(
                subjectType,
                sampleAttendee,
                sampleRegistration,
                qrPreview,
                event,
            ),
        [subjectType, sampleAttendee, sampleRegistration, qrPreview, event],
    );

    // A registration category's custom form fields, exposed as bindable
    // fields only while that specific category is selected — different
    // categories can have entirely different schemas, so this can't be
    // shown for the "All categories" default context.
    const customFields: BindableField[] = useMemo(() => {
        if (subjectType !== 'registration' || !registrationCategoryId) {
            return [];
        }

        const category = registrationCategories.find(
            (c) => c.id === registrationCategoryId,
        );
        const fields = (category?.form_pages ?? []).flatMap(
            (page) => page.fields,
        );

        return fields
            .filter((field) => !RESERVED_FIELD_KEYS.includes(field.key))
            .map((field) => ({
                value: `form_data.${field.key}`,
                label: field.label,
                kinds: field.type === 'file' ? ['image'] : ['text'],
            }));
    }, [subjectType, registrationCategoryId, registrationCategories]);

    /** Fit the card to the visible area, capped at 100% so small cards aren't blown up. */
    const fitToView = useCallback(() => {
        const viewport = viewportRef.current;

        if (!viewport) {
            return;
        }

        const scale = Math.min(
            (viewport.clientWidth - 80) / canvas.width,
            (viewport.clientHeight - 80) / canvas.height,
            1,
        );

        setZoom(Math.max(0.1, Math.round(scale * 100) / 100));
    }, [canvas.width, canvas.height]);

    useEffect(() => {
        fitToView();
        // Only on mount / canvas size change — manual zoom must survive re-renders.
    }, [fitToView]);

    // Bring a newly added or newly selected element into view — otherwise a
    // freshly added layer can render above the fold of a scrolled/zoomed
    // canvas and look like it never appeared.
    useEffect(() => {
        if (selectedIds.length !== 1) {
            return;
        }

        const node = viewportRef.current?.querySelector(
            `[data-element-id="${selectedIds[0]}"]`,
        );
        node?.scrollIntoView({
            behavior: 'smooth',
            block: 'nearest',
            inline: 'nearest',
        });
    }, [selectedIds]);

    /** Jump to the next preset step above/below the current (possibly fitted) zoom. */
    const stepZoom = useCallback((direction: 1 | -1) => {
        setZoom((current) => {
            const next =
                direction === 1
                    ? ZOOM_STEPS.find((step) => step > current + 0.001)
                    : [...ZOOM_STEPS]
                          .reverse()
                          .find((step) => step < current - 0.001);

            return next ?? current;
        });
    }, []);

    const handleGeometryChange = useCallback(
        (updates: Record<string, Box>) => {
            designer.setElements(
                (prev) =>
                    prev.map((el) =>
                        updates[el.id] ? { ...el, ...updates[el.id] } : el,
                    ),
                { history: false },
            );
        },
        [designer],
    );

    const handleAlign = useCallback(
        (align: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom') => {
            if (selectedIds.length === 0) {
                return;
            }

            designer.setElements((prev) =>
                prev.map((el) => {
                    if (!selectedIds.includes(el.id)) {
                        return el;
                    }

                    switch (align) {
                        case 'left':
                            return { ...el, x: 0 };
                        case 'center':
                            return {
                                ...el,
                                x: Math.round((canvas.width - el.width) / 2),
                            };
                        case 'right':
                            return { ...el, x: canvas.width - el.width };
                        case 'top':
                            return { ...el, y: 0 };
                        case 'middle':
                            return {
                                ...el,
                                y: Math.round((canvas.height - el.height) / 2),
                            };
                        default:
                            return { ...el, y: canvas.height - el.height };
                    }
                }),
            );
        },
        [designer, selectedIds, canvas.width, canvas.height],
    );

    const handleCanvasResize = useCallback(
        (width: number, height: number) => {
            const next = {
                ...canvas,
                width: Math.max(80, width),
                height: Math.max(80, height),
            };

            designer.replaceAll({
                canvas: next,
                elements: rescaleElements(elements, canvas, next),
            });
        },
        [designer, canvas, elements],
    );

    /** Drop a pre-bound element straight onto the canvas from the field list. */
    const addBoundField = useCallback(
        (field: string, kind: CardElementKind) => {
            designer.addElement(kind, {
                binding: field,
                staticText: undefined,
            });
        },
        [designer],
    );

    const handleSave = useCallback(() => {
        setSaving(true);

        // Cast: canvas/elements are plain JSON-serializable objects, but their
        // literal-union style types don't structurally satisfy Inertia's
        // FormDataConvertible index signature.
        const payload = {
            subject_type: subjectType,
            attendee_type_id: attendeeTypeId,
            registration_category_id: registrationCategoryId,
            name,
            canvas,
            elements,
        } as unknown as Record<string, FormDataConvertible>;

        const options = {
            preserveScroll: true,
            preserveState: true as const,
            onSuccess: () => designer.markSaved(),
            onFinish: () => setSaving(false),
        };

        if (template.id) {
            router.put(
                `/dashboard/events/${event.id}/id-card-templates/${template.id}`,
                payload,
                options,
            );
        } else {
            router.post(
                `/dashboard/events/${event.id}/id-card-templates`,
                payload,
                options,
            );
        }
    }, [
        subjectType,
        attendeeTypeId,
        registrationCategoryId,
        name,
        canvas,
        elements,
        template.id,
        event.id,
        designer,
    ]);

    // Keyboard shortcuts — skipped whenever focus sits in a form control.
    useEffect(() => {
        function onKeyDown(e: KeyboardEvent) {
            const target = e.target as HTMLElement | null;

            if (
                target?.closest(
                    'input, textarea, select, [contenteditable="true"]',
                )
            ) {
                return;
            }

            const mod = e.metaKey || e.ctrlKey;

            if (mod && e.key.toLowerCase() === 's') {
                e.preventDefault();
                handleSave();

                return;
            }

            if (mod && e.key.toLowerCase() === 'z') {
                e.preventDefault();

                if (e.shiftKey) {
                    designer.redo();
                } else {
                    designer.undo();
                }

                return;
            }

            if (mod && e.key.toLowerCase() === 'y') {
                e.preventDefault();
                designer.redo();

                return;
            }

            if (mod && e.key.toLowerCase() === 'a') {
                e.preventDefault();
                setSelectedIds(
                    elements
                        .filter((el) => !el.locked && !el.hidden)
                        .map((el) => el.id),
                );

                return;
            }

            if (mod && e.key.toLowerCase() === 'd') {
                e.preventDefault();
                designer.duplicateElements(selectedIds);

                return;
            }

            if (e.key === 'Escape') {
                setSelectedIds([]);

                return;
            }

            if (selectedIds.length === 0) {
                return;
            }

            if (e.key === 'Delete' || e.key === 'Backspace') {
                e.preventDefault();
                designer.removeElements(selectedIds);

                return;
            }

            const nudge: Record<string, [number, number]> = {
                ArrowLeft: [-1, 0],
                ArrowRight: [1, 0],
                ArrowUp: [0, -1],
                ArrowDown: [0, 1],
            };

            const delta = nudge[e.key];

            if (delta) {
                e.preventDefault();
                const step = e.shiftKey ? 10 : 1;

                designer.setElements((prev) =>
                    prev.map((el) =>
                        selectedIds.includes(el.id) && !el.locked
                            ? {
                                  ...el,
                                  x: el.x + delta[0] * step,
                                  y: el.y + delta[1] * step,
                              }
                            : el,
                    ),
                );
            }
        }

        window.addEventListener('keydown', onKeyDown);

        return () => window.removeEventListener('keydown', onKeyDown);
    }, [designer, elements, selectedIds, setSelectedIds, handleSave]);

    // Guard against losing work on reload / tab close.
    useEffect(() => {
        if (!isDirty) {
            return;
        }

        function onBeforeUnload(e: BeforeUnloadEvent) {
            e.preventDefault();
        }

        window.addEventListener('beforeunload', onBeforeUnload);

        return () => window.removeEventListener('beforeunload', onBeforeUnload);
    }, [isDirty]);

    function switchContext(value: string) {
        if (
            isDirty &&
            !window.confirm(
                'You have unsaved changes. Discard them and switch card type?',
            )
        ) {
            return;
        }

        const [kind, id] = value.split(':');
        const params =
            kind === 'attendee'
                ? {
                      subject_type: 'attendee',
                      attendee_type_id: id === 'all' ? undefined : Number(id),
                  }
                : kind === 'registration'
                  ? {
                        subject_type: 'registration',
                        registration_category_id:
                            id === 'all' ? undefined : Number(id),
                    }
                  : { subject_type: kind };

        router.get(
            `/dashboard/events/${event.id}/id-card-templates/builder`,
            params,
            { preserveState: false },
        );
    }

    function resetToDefault() {
        if (
            !window.confirm(
                'Replace the current design with the built-in default layout?',
            )
        ) {
            return;
        }

        designer.replaceAll({
            canvas: defaultTemplate.canvas,
            elements: (defaultTemplate.elements ?? []).map(normalizeElement),
        });
    }

    const errorList = Object.values(errors ?? {});
    const contextLabel =
        subjectType === 'attendee'
            ? (attendeeTypes.find((t) => t.id === attendeeTypeId)?.label ??
              'All attendee types')
            : subjectType === 'registration'
              ? (registrationCategories.find(
                    (c) => c.id === registrationCategoryId,
                )?.name ?? 'All registration categories')
              : SUBJECT_LABEL[subjectType];

    return (
        <div className="flex h-[calc(100svh-4rem)] flex-col">
            <Head title={`Card Designer · ${event.name}`} />

            {/* Toolbar */}
            <header className="flex shrink-0 flex-wrap items-center gap-3 border-b bg-background px-4 py-2.5">
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 shrink-0"
                    asChild
                >
                    <Link
                        href={`/dashboard/events/${event.id}/id-card-templates`}
                        aria-label="Back to templates"
                    >
                        <ChevronLeft className="h-5 w-5" />
                    </Link>
                </Button>

                <div className="flex min-w-0 items-center gap-2">
                    <Input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        aria-label="Template name"
                        className="h-9 w-48 border-transparent bg-transparent text-sm font-semibold shadow-none hover:border-input focus-visible:border-input"
                    />
                    {isDirty && (
                        <Badge
                            variant="outline"
                            className="shrink-0 gap-1.5 text-[11px] font-normal"
                        >
                            <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                            Unsaved
                        </Badge>
                    )}
                </div>

                <Separator orientation="vertical" className="h-6" />

                <Select
                    value={contextValue(
                        subjectType,
                        attendeeTypeId,
                        registrationCategoryId,
                    )}
                    onValueChange={switchContext}
                >
                    <SelectTrigger className="h-9 w-56" aria-label="Card type">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectGroup>
                            <SelectLabel>Attendees</SelectLabel>
                            <SelectItem value="attendee:all">
                                All types (default)
                            </SelectItem>
                            {attendeeTypes.map((type) => (
                                <SelectItem
                                    key={type.id}
                                    value={`attendee:${type.id}`}
                                >
                                    {type.label}
                                </SelectItem>
                            ))}
                        </SelectGroup>
                        <SelectGroup>
                            <SelectLabel>Registrations</SelectLabel>
                            <SelectItem value="registration:all">
                                All categories (default)
                            </SelectItem>
                            {registrationCategories.map((category) => (
                                <SelectItem
                                    key={category.id}
                                    value={`registration:${category.id}`}
                                >
                                    {category.name}
                                </SelectItem>
                            ))}
                        </SelectGroup>
                        <SelectGroup>
                            <SelectLabel>Tournament</SelectLabel>
                            <SelectItem value="player">Players</SelectItem>
                            <SelectItem value="team">Teams</SelectItem>
                        </SelectGroup>
                    </SelectContent>
                </Select>

                <div className="ml-auto flex items-center gap-1">
                    <ToolbarIcon
                        label="Undo (Ctrl+Z)"
                        icon={Undo2}
                        onClick={designer.undo}
                        disabled={!designer.canUndo}
                    />
                    <ToolbarIcon
                        label="Redo (Ctrl+Shift+Z)"
                        icon={Redo2}
                        onClick={designer.redo}
                        disabled={!designer.canRedo}
                    />
                    <ToolbarIcon
                        label="Reset to default layout"
                        icon={RotateCcw}
                        onClick={resetToDefault}
                    />

                    <Popover>
                        <PopoverTrigger asChild>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-9 w-9"
                                aria-label="Keyboard shortcuts"
                            >
                                <Keyboard className="h-4 w-4" />
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent align="end" className="w-72">
                            <h4 className="mb-2 text-sm font-semibold">
                                Shortcuts
                            </h4>
                            <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-xs">
                                {SHORTCUTS.map(([keys, description]) => (
                                    <div key={keys} className="contents">
                                        <dt className="font-mono text-[11px] text-muted-foreground">
                                            {keys}
                                        </dt>
                                        <dd>{description}</dd>
                                    </div>
                                ))}
                            </dl>
                        </PopoverContent>
                    </Popover>

                    <Separator orientation="vertical" className="mx-1 h-6" />

                    <Button
                        onClick={handleSave}
                        disabled={saving}
                        className="min-w-28"
                    >
                        {saving ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <Save className="h-4 w-4" />
                        )}
                        {saving ? 'Saving…' : 'Save'}
                    </Button>
                </div>
            </header>

            {errorList.length > 0 && (
                <div className="shrink-0 border-b border-destructive/30 bg-destructive/10 px-4 py-2 text-sm text-destructive">
                    <strong className="font-medium">
                        Couldn’t save this template.
                    </strong>{' '}
                    {errorList[0]}
                </div>
            )}

            <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[240px_1fr_290px]">
                {/* Left rail: insert + layers */}
                <aside className="flex min-h-0 flex-col overflow-y-auto border-r">
                    <div className="border-b px-4 py-3.5">
                        <h3 className="mb-2.5 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                            Add
                        </h3>
                        <div className="grid grid-cols-2 gap-1.5">
                            {ADD_BUTTONS.map(({ kind, label, icon: Icon }) => (
                                <Button
                                    key={kind}
                                    variant="outline"
                                    size="sm"
                                    className="h-8 justify-start text-xs"
                                    onClick={() => designer.addElement(kind)}
                                >
                                    <Icon className="h-3.5 w-3.5" /> {label}
                                </Button>
                            ))}
                        </div>
                    </div>

                    <div className="border-b px-4 py-3.5">
                        <h3 className="mb-1 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                            {contextLabel} fields
                        </h3>
                        <p className="mb-2.5 text-[11px] leading-relaxed text-muted-foreground">
                            Click to place a layer that fills itself from each
                            card&apos;s data.
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                            {[
                                ...BINDABLE_FIELDS[subjectType],
                                ...customFields,
                            ].map((field) => (
                                <button
                                    key={field.value}
                                    type="button"
                                    onClick={() =>
                                        addBoundField(
                                            field.value,
                                            field.kinds[0],
                                        )
                                    }
                                    className="rounded-full border bg-background px-2.5 py-1 text-[11px] transition-colors hover:border-primary hover:bg-primary/5 hover:text-primary"
                                >
                                    {field.label}
                                </button>
                            ))}
                        </div>
                        {subjectType === 'registration' &&
                            !registrationCategoryId && (
                                <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground italic">
                                    Select a specific category above to bind its
                                    custom fields too.
                                </p>
                            )}
                    </div>

                    <div className="flex min-h-0 flex-1 flex-col">
                        <h3 className="px-4 pt-3.5 pb-1 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                            Layers
                        </h3>
                        <div className="min-h-0 flex-1 overflow-y-auto">
                            <LayersPanel
                                elements={elements}
                                subjectType={subjectType}
                                customFields={customFields}
                                selectedIds={selectedIds}
                                onSelect={setSelectedIds}
                                onToggle={(id, patch) =>
                                    designer.updateElement(id, patch)
                                }
                                onReorder={designer.reorder}
                                onReorderAll={designer.reorderAll}
                                onDuplicate={designer.duplicateElements}
                                onDelete={designer.removeElements}
                            />
                        </div>
                    </div>
                </aside>

                {/* Canvas viewport */}
                <div className="flex min-h-0 flex-col bg-muted/40">
                    <div className="flex shrink-0 items-center gap-1 border-b bg-background/60 px-3 py-1.5 backdrop-blur">
                        <ToolbarIcon
                            label="Zoom out"
                            icon={Minus}
                            onClick={() => stepZoom(-1)}
                            disabled={zoom <= ZOOM_STEPS[0]}
                        />
                        <span className="w-12 text-center text-xs text-muted-foreground tabular-nums">
                            {Math.round(zoom * 100)}%
                        </span>
                        <ToolbarIcon
                            label="Zoom in"
                            icon={Plus}
                            onClick={() => stepZoom(1)}
                            disabled={zoom >= ZOOM_STEPS.at(-1)!}
                        />
                        <ToolbarIcon
                            label="Fit to screen"
                            icon={Maximize2}
                            onClick={fitToView}
                        />

                        <Separator
                            orientation="vertical"
                            className="mx-1.5 h-5"
                        />

                        <ToolbarIcon
                            label="Toggle grid"
                            icon={Grid3x3}
                            active={showGrid}
                            onClick={() => setShowGrid((v) => !v)}
                        />
                        <ToolbarIcon
                            label="Toggle snapping"
                            icon={Magnet}
                            active={snapEnabled}
                            onClick={() => setSnapEnabled((v) => !v)}
                        />

                        <span className="ml-auto text-xs text-muted-foreground tabular-nums">
                            {canvas.width} × {canvas.height} px
                        </span>
                    </div>

                    <div
                        ref={viewportRef}
                        className="flex min-h-0 flex-1 items-center justify-center overflow-auto p-10"
                    >
                        <DesignCanvas
                            canvas={canvas}
                            elements={elements}
                            data={previewData}
                            zoom={zoom}
                            showGrid={showGrid}
                            snapEnabled={snapEnabled}
                            selectedIds={selectedIds}
                            onSelect={setSelectedIds}
                            onGestureStart={designer.pushHistory}
                            onGeometryChange={handleGeometryChange}
                        />
                    </div>
                </div>

                {/* Inspector */}
                <aside className="min-h-0 overflow-y-auto border-l">
                    <InspectorPanel
                        canvas={canvas}
                        subjectType={subjectType}
                        customFields={customFields}
                        selected={selected}
                        selectionCount={selectedIds.length}
                        onCanvasChange={designer.setCanvas}
                        onCanvasResize={handleCanvasResize}
                        onElementChange={designer.updateElement}
                        onStyleChange={designer.updateStyle}
                        onAlign={handleAlign}
                        onDuplicate={() =>
                            designer.duplicateElements(selectedIds)
                        }
                        onDelete={() => designer.removeElements(selectedIds)}
                    />
                </aside>
            </div>
        </div>
    );
}

function ToolbarIcon({
    label,
    icon: Icon,
    onClick,
    disabled,
    active,
}: {
    label: string;
    icon: typeof Undo2;
    onClick: () => void;
    disabled?: boolean;
    active?: boolean;
}) {
    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <Button
                    variant="ghost"
                    size="icon"
                    aria-label={label}
                    aria-pressed={active}
                    disabled={disabled}
                    onClick={onClick}
                    className={cn(
                        'h-8 w-8',
                        active && 'bg-primary/10 text-primary',
                    )}
                >
                    <Icon className="h-4 w-4" />
                </Button>
            </TooltipTrigger>
            <TooltipContent>{label}</TooltipContent>
        </Tooltip>
    );
}
