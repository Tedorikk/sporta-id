import { Head, Link } from '@inertiajs/react';
import {
    ChevronLeft,
    Loader2,
    PenSquare,
    Printer,
    Scissors,
} from 'lucide-react';
import QRCode from 'qrcode';
import type { ReactNode } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { APP_LOGO_URL } from '@/components/id-card/card-presets';
import {
    formDataBindings,
    IdCardRenderer,
} from '@/components/id-card/id-card-renderer';
import type { IdCardData } from '@/components/id-card/id-card-renderer';
import { ToolbarIcon } from '@/components/id-card/toolbar-icon';
import { Button } from '@/components/ui/button';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { formatImageUrl } from '@/lib/image-utils';
import type { PrintSize, PrintSlot } from '@/types/card-print';
import type { CardTemplate } from '@/types/card-template';
import type { Event } from '@/types/event';
import type { Registration } from '@/types/registration';
import type { RegistrationCategory } from '@/types/registration-category';

/**
 * Batch ID card printing — the output side of the ID card designer, and
 * deliberately dressed like it: same toolbar shell, same muted viewport, and
 * the same `IdCardRenderer` drawing each card, so a sheet is recognisably the
 * design the organizer built.
 *
 * Lives outside `pages/dashboard/` so `app.tsx` doesn't wrap it in AppLayout —
 * the sidebar and app chrome have no business on a sheet of badges.
 */
const MM_TO_PX = 96 / 25.4;

/**
 * Matches the designer canvas's drop shadow, so a sheet on screen sits on the
 * workspace the same way a card does in the builder.
 */
const PAPER_SHADOW =
    '0 18px 50px -12px rgba(15, 23, 42, 0.35), 0 0 0 1px rgba(15, 23, 42, 0.08)';

/** Aspect ratios within this much of each other fill a slot without visible margins. */
const ASPECT_TOLERANCE = 0.01;

/**
 * Millimetres trimmed off each sheet when printing. Browsers lay out in
 * fractional pixels and paginate in whole ones, so a box sized to exactly the
 * paper can measure a hair taller than the page it is meant to fill and push a
 * blank sheet out of the printer. This is well inside the empty margin the
 * layout already leaves, so nothing moves and nothing is cut.
 */
const SHEET_UNDERSIZE = 0.5;

interface Props {
    event: Event;
    registrationCategory: RegistrationCategory;
    template: CardTemplate;
    registrations: Registration[];
    sizes: PrintSize[];
}

function chunk<T>(items: T[], size: number): T[][] {
    if (size < 1) {
        return [];
    }

    const sheets: T[][] = [];

    for (let i = 0; i < items.length; i += size) {
        sheets.push(items.slice(i, i + size));
    }

    return sheets;
}

/** One card, scaled to sit inside a slot of exactly `width` x `height` mm. */
function PrintedCard({
    template,
    data,
    width,
    height,
}: {
    template: CardTemplate;
    data: IdCardData;
    width: number;
    height: number;
}) {
    // Contain rather than stretch: a design whose aspect ratio doesn't match
    // the chosen card size should letterbox, not print distorted. The toolbar
    // warns when that happens so it never comes as a surprise at the printer.
    const scale = Math.min(
        (width * MM_TO_PX) / template.canvas.width,
        (height * MM_TO_PX) / template.canvas.height,
    );

    return (
        <div
            style={{
                width: '100%',
                height: '100%',
                overflow: 'hidden',
                background: template.canvas.background || '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
            }}
        >
            <div
                style={{
                    flex: 'none',
                    width: template.canvas.width,
                    height: template.canvas.height,
                    transform: `scale(${scale})`,
                    transformOrigin: 'center center',
                }}
            >
                <IdCardRenderer template={template} data={data} />
            </div>
        </div>
    );
}

/** Places one card in its slot, turning it a quarter turn when the slot is sideways. */
function CardSlot({
    slot,
    size,
    showCutGuides,
    children,
}: {
    slot: PrintSlot;
    size: PrintSize;
    showCutGuides: boolean;
    children: ReactNode;
}) {
    const { width, height } = size.card;
    const footprintWidth = slot.rotated ? height : width;
    const footprintHeight = slot.rotated ? width : height;

    return (
        <div
            style={{
                position: 'absolute',
                left: `${slot.x}mm`,
                top: `${slot.y}mm`,
                width: `${footprintWidth}mm`,
                height: `${footprintHeight}mm`,
                outline: showCutGuides ? '0.2mm dashed #94a3b8' : undefined,
                outlineOffset: '-0.1mm',
            }}
        >
            <div
                style={{
                    position: 'absolute',
                    left: '50%',
                    top: '50%',
                    width: `${width}mm`,
                    height: `${height}mm`,
                    transform: `translate(-50%, -50%)${slot.rotated ? ' rotate(90deg)' : ''}`,
                }}
            >
                {children}
            </div>
        </div>
    );
}

export default function IdCardPrint({
    event,
    registrationCategory,
    template,
    registrations,
    sizes,
}: Props) {
    const [sizeKey, setSizeKey] = useState(sizes[0]?.key ?? '');
    const [showCutGuides, setShowCutGuides] = useState(true);
    const [qrCodes, setQrCodes] = useState<Record<string, string>>({});
    const printedRef = useRef(false);

    const size = sizes.find((option) => option.key === sizeKey) ?? sizes[0];

    useEffect(() => {
        let cancelled = false;

        Promise.all(
            registrations.map(
                async (registration) =>
                    [
                        registration.qr_token,
                        await QRCode.toDataURL(
                            `${window.location.origin}/registrations/${registration.qr_token}/id-card`,
                            {
                                width: 280,
                                margin: 1,
                                color: { dark: '#1a1a2e', light: '#ffffff' },
                                errorCorrectionLevel: 'H',
                            },
                        ),
                    ] as const,
            ),
        ).then((entries) => {
            if (!cancelled) {
                setQrCodes(Object.fromEntries(entries));
            }
        });

        return () => {
            cancelled = true;
        };
    }, [registrations]);

    const isReady =
        registrations.length > 0 &&
        registrations.every((registration) => qrCodes[registration.qr_token]);

    // "Print automatically": once every QR code is drawn and every photo has
    // decoded, open the print dialog unprompted. Skipping the decode wait sends
    // sheets to the printer with empty photo boxes.
    useEffect(() => {
        if (!isReady) {
            return;
        }

        let cancelled = false;

        Promise.all(
            Array.from(document.images).map((image) =>
                image.decode().catch(() => undefined),
            ),
        ).then(() => {
            if (cancelled || printedRef.current) {
                return;
            }

            printedRef.current = true;
            window.print();
        });

        return () => {
            cancelled = true;
        };
    }, [isReady]);

    const cards = useMemo(
        () =>
            registrations.map((registration) => ({
                registration,
                data: {
                    name: registration.name,
                    photo: registration.photo ?? undefined,
                    typeLabel: registrationCategory.name,
                    organization: undefined,
                    status: registration.status,
                    email: registration.email ?? undefined,
                    phone: registration.phone ?? undefined,
                    qrDataUrl: qrCodes[registration.qr_token] ?? '',
                    eventName: event.name,
                    eventLogo: event.logo
                        ? formatImageUrl(event.logo)
                        : undefined,
                    appLogo: APP_LOGO_URL,
                    ...formDataBindings(registration.form_data),
                } satisfies IdCardData,
            })),
        [registrations, registrationCategory.name, event, qrCodes],
    );

    const sheets = size ? chunk(cards, size.per_sheet) : [];

    const categoryUrl = `/dashboard/events/${event.id}/registration-categories/${registrationCategory.id}`;
    const designerUrl = `/dashboard/events/${event.id}/id-card-templates/builder?subject_type=registration&registration_category_id=${registrationCategory.id}`;

    // A design drawn at a different shape than the paper size can only be
    // centred with blank margins — say so here rather than letting it turn up
    // at the printer.
    const aspectMismatch =
        size !== undefined &&
        Math.abs(
            template.canvas.width / template.canvas.height -
                size.card.width / size.card.height,
        ) > ASPECT_TOLERANCE;

    return (
        <div className="flex h-svh flex-col print:block print:h-auto">
            <Head title={`Print ID cards · ${registrationCategory.name}`} />

            {size && (
                <style>
                    {[
                        `@page { size: ${size.paper.width}mm ${size.paper.height}mm; margin: 0; }`,
                        `.print-sheet { print-color-adjust: exact; -webkit-print-color-adjust: exact; }`,
                        `@media print {`,
                        `  html, body { background: #fff; margin: 0; padding: 0; }`,
                        // Spelled out rather than left to the Tailwind print:
                        // variants, so the stack the sheets sit in cannot
                        // contribute a stray gap or scroll box to the paginator.
                        `  .print-sheets { display: block !important; gap: 0 !important; padding: 0 !important; overflow: visible !important; }`,
                        `  .print-sheet {`,
                        `    box-shadow: none !important;`,
                        `    border-radius: 0 !important;`,
                        `    overflow: hidden;`,
                        `    break-inside: avoid;`,
                        // A sheet sized to exactly the page can round a fraction
                        // of a pixel past it and spill a near-blank page after
                        // itself. A hair under cannot, and the trim comes out of
                        // the margin the layout already leaves empty.
                        `    width: ${size.paper.width - SHEET_UNDERSIZE}mm !important;`,
                        `    height: ${size.paper.height - SHEET_UNDERSIZE}mm !important;`,
                        `  }`,
                        // Break *before* each sheet but the first. Breaking after
                        // every sheet leaves a trailing break with nothing behind
                        // it, which is one blank page at the end of the job.
                        `  .print-sheet + .print-sheet { break-before: page; }`,
                        `}`,
                    ].join('\n')}
                </style>
            )}

            <header className="flex shrink-0 flex-wrap items-center gap-3 border-b bg-background px-4 py-2.5 print:hidden">
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 shrink-0"
                    asChild
                >
                    <Link href={categoryUrl} aria-label="Back to registrations">
                        <ChevronLeft className="h-5 w-5" />
                    </Link>
                </Button>

                <div className="flex min-w-0 flex-col">
                    <h1 className="truncate text-sm font-semibold">
                        {registrationCategory.name} ID cards
                    </h1>
                    <p className="truncate text-[11px] text-muted-foreground">
                        {registrations.length} confirmed registrant
                        {registrations.length === 1 ? '' : 's'}
                        {sheets.length > 0 &&
                            ` · ${sheets.length} sheet${sheets.length === 1 ? '' : 's'}`}
                    </p>
                </div>

                <Separator orientation="vertical" className="h-6" />

                <Select value={sizeKey} onValueChange={setSizeKey}>
                    <SelectTrigger className="h-9 w-56" aria-label="Card size">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        {sizes.map((option) => (
                            <SelectItem key={option.key} value={option.key}>
                                {option.label} — {option.hint}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                <div className="ml-auto flex items-center gap-1">
                    <ToolbarIcon
                        label="Toggle cut guides"
                        icon={Scissors}
                        active={showCutGuides}
                        onClick={() => setShowCutGuides((value) => !value)}
                    />

                    <Button variant="ghost" size="sm" asChild>
                        <Link href={designerUrl}>
                            <PenSquare className="h-4 w-4" /> Edit design
                        </Link>
                    </Button>

                    <Separator orientation="vertical" className="mx-1 h-6" />

                    <Button
                        onClick={() => window.print()}
                        disabled={!isReady}
                        className="min-w-28"
                    >
                        {isReady ? (
                            <Printer className="h-4 w-4" />
                        ) : (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        )}
                        {isReady ? 'Print' : 'Preparing…'}
                    </Button>
                </div>
            </header>

            {aspectMismatch && (
                <div className="shrink-0 border-b border-amber-500/30 bg-amber-500/10 px-4 py-2 text-sm text-amber-700 dark:text-amber-400 print:hidden">
                    <strong className="font-medium">
                        This design isn&apos;t shaped like a {size.card.label}{' '}
                        card.
                    </strong>{' '}
                    It was drawn {template.canvas.width} ×{' '}
                    {template.canvas.height} px, so each card prints centred
                    with blank margins. Pick the {size.card.label} preset in the{' '}
                    <Link
                        href={designerUrl}
                        className="font-medium underline underline-offset-2"
                    >
                        card designer
                    </Link>{' '}
                    for an edge-to-edge fit.
                </div>
            )}

            {registrations.length === 0 || !size ? (
                <div className="flex flex-1 items-center justify-center bg-muted/40 px-4 print:hidden">
                    <div className="max-w-sm text-center">
                        <p className="text-sm font-medium">
                            Nothing to print yet
                        </p>
                        <p className="mt-1 text-sm text-muted-foreground">
                            ID cards are only issued to confirmed registrations.
                            As soon as a registration is confirmed, its card
                            shows up here.
                        </p>
                    </div>
                </div>
            ) : (
                <div className="flex min-h-0 flex-1 flex-col bg-muted/40 print:block print:bg-transparent">
                    <div className="flex shrink-0 items-center gap-1 border-b bg-background/60 px-3 py-1.5 backdrop-blur print:hidden">
                        <span className="text-xs text-muted-foreground">
                            {size.hint}
                        </span>
                        <span className="ml-auto text-xs text-muted-foreground tabular-nums">
                            {size.paper.label} · {size.paper.width} ×{' '}
                            {size.paper.height} mm
                        </span>
                    </div>

                    <div className="print-sheets flex min-h-0 flex-1 flex-col items-center gap-10 overflow-auto p-10">
                        {sheets.map((sheet, sheetIndex) => (
                            <div
                                key={sheetIndex}
                                className="print-sheet relative shrink-0"
                                style={{
                                    width: `${size.paper.width}mm`,
                                    height: `${size.paper.height}mm`,
                                    background: '#ffffff',
                                    boxShadow: PAPER_SHADOW,
                                    borderRadius: 2,
                                }}
                            >
                                {sheet.map((card, cardIndex) => (
                                    <CardSlot
                                        key={card.registration.id}
                                        slot={size.slots[cardIndex]}
                                        size={size}
                                        showCutGuides={showCutGuides}
                                    >
                                        <PrintedCard
                                            template={template}
                                            data={card.data}
                                            width={size.card.width}
                                            height={size.card.height}
                                        />
                                    </CardSlot>
                                ))}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
