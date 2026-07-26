import type { CardCanvas, CardElement, CardSubjectType } from '@/types/card-template';

export interface CanvasPreset {
    key: string;
    label: string;
    hint: string;
    width: number;
    height: number;
}

/** Sizes are CSS pixels at 96 DPI, so the printed dimensions in `hint` hold true. */
export const CANVAS_PRESETS: CanvasPreset[] = [
    { key: 'badge-portrait', label: 'Event badge', hint: '3.5 × 5 in', width: 336, height: 480 },
    { key: 'badge-large', label: 'Large badge', hint: '4 × 6 in', width: 384, height: 576 },
    { key: 'classic', label: 'Classic portrait', hint: '380 × 560 px', width: 380, height: 560 },
    { key: 'cr80-portrait', label: 'ID card, portrait', hint: 'CR80 · 54 × 85.6 mm', width: 204, height: 323 },
    { key: 'cr80-landscape', label: 'ID card, landscape', hint: 'CR80 · 85.6 × 54 mm', width: 323, height: 204 },
    { key: 'square', label: 'Square', hint: '400 × 400 px', width: 400, height: 400 },
];

export function matchPreset(canvas: CardCanvas): CanvasPreset | null {
    return CANVAS_PRESETS.find((preset) => preset.width === canvas.width && preset.height === canvas.height) ?? null;
}

/**
 * Rescale every element proportionally when the canvas is resized, so switching
 * a preset re-flows the design instead of leaving elements off-card.
 */
export function rescaleElements(elements: CardElement[], from: CardCanvas, to: CardCanvas): CardElement[] {
    if (from.width === to.width && from.height === to.height) {
        return elements;
    }

    const sx = to.width / from.width;
    const sy = to.height / from.height;
    const sMin = Math.min(sx, sy);

    return elements.map((el) => ({
        ...el,
        x: Math.round(el.x * sx),
        y: Math.round(el.y * sy),
        width: Math.round(el.width * sx),
        height: Math.round(el.height * sy),
        style: el.style?.fontSize ? { ...el.style, fontSize: Math.max(6, Math.round(el.style.fontSize * sMin)) } : el.style,
    }));
}

export const SUBJECT_LABEL: Record<CardSubjectType, string> = {
    attendee: 'Attendee',
    player: 'Player',
    team: 'Team',
};

export const FONT_FAMILIES: { value: string; label: string }[] = [
    { value: 'Instrument Sans, ui-sans-serif, system-ui, sans-serif', label: 'Instrument Sans' },
    { value: 'ui-sans-serif, system-ui, sans-serif', label: 'System sans' },
    { value: 'Georgia, ui-serif, serif', label: 'Serif' },
    { value: 'ui-monospace, SFMono-Regular, Menlo, monospace', label: 'Monospace' },
    { value: 'Impact, Haettenschweiler, sans-serif', label: 'Condensed display' },
];

export const FONT_WEIGHTS: { value: number; label: string }[] = [
    { value: 300, label: 'Light' },
    { value: 400, label: 'Regular' },
    { value: 500, label: 'Medium' },
    { value: 600, label: 'Semibold' },
    { value: 700, label: 'Bold' },
    { value: 800, label: 'Extrabold' },
];

/** Swatches offered next to every colour input. */
export const COLOR_SWATCHES = [
    '#ffffff',
    '#f8fafc',
    '#e2e8f0',
    '#94a3b8',
    '#475569',
    '#0f172a',
    '#000000',
    '#dc2626',
    '#ea580c',
    '#ca8a04',
    '#16a34a',
    '#0891b2',
    '#2563eb',
    '#7c3aed',
    '#db2777',
];
