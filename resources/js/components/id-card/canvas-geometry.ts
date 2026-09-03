import type { CardCanvas, CardElement } from '@/types/card-template';

export interface Box {
    x: number;
    y: number;
    width: number;
    height: number;
}

export type ResizeHandle = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w';

export const RESIZE_HANDLES: ResizeHandle[] = [
    'nw',
    'n',
    'ne',
    'e',
    'se',
    's',
    'sw',
    'w',
];

export const HANDLE_CURSOR: Record<ResizeHandle, string> = {
    nw: 'nwse-resize',
    se: 'nwse-resize',
    ne: 'nesw-resize',
    sw: 'nesw-resize',
    n: 'ns-resize',
    s: 'ns-resize',
    e: 'ew-resize',
    w: 'ew-resize',
};

/** Percentage offsets of each handle within the selection box. */
export const HANDLE_ANCHOR: Record<
    ResizeHandle,
    { left: string; top: string }
> = {
    nw: { left: '0%', top: '0%' },
    n: { left: '50%', top: '0%' },
    ne: { left: '100%', top: '0%' },
    e: { left: '100%', top: '50%' },
    se: { left: '100%', top: '100%' },
    s: { left: '50%', top: '100%' },
    sw: { left: '0%', top: '100%' },
    w: { left: '0%', top: '50%' },
};

export const MIN_ELEMENT_SIZE = 8;

/** A snap line the canvas draws while an element is being moved or resized. */
export interface SnapGuide {
    axis: 'x' | 'y';
    position: number;
}

const SNAP_THRESHOLD = 6;

interface SnapTargets {
    x: number[];
    y: number[];
}

/**
 * Candidate alignment positions: canvas edges + centre, plus the edges and
 * centres of every other (visible) element.
 */
export function collectSnapTargets(
    canvas: CardCanvas,
    elements: CardElement[],
    excludeId: string | null,
): SnapTargets {
    const x = [0, canvas.width / 2, canvas.width];
    const y = [0, canvas.height / 2, canvas.height];

    for (const el of elements) {
        if (el.id === excludeId || el.hidden) {
            continue;
        }

        x.push(el.x, el.x + el.width / 2, el.x + el.width);
        y.push(el.y, el.y + el.height / 2, el.y + el.height);
    }

    return { x, y };
}

/** Nearest target within the threshold, or null. `scale` keeps the threshold constant in screen pixels. */
function nearest(
    value: number,
    targets: number[],
    scale: number,
): number | null {
    let best: number | null = null;
    let bestDistance = SNAP_THRESHOLD / scale;

    for (const target of targets) {
        const distance = Math.abs(target - value);

        if (distance <= bestDistance) {
            bestDistance = distance;
            best = target;
        }
    }

    return best;
}

/**
 * Snap a moving box by translating it — tries the leading edge, centre and
 * trailing edge on each axis and applies whichever lands closest.
 */
export function snapMove(
    box: Box,
    targets: SnapTargets,
    scale: number,
): { box: Box; guides: SnapGuide[] } {
    const guides: SnapGuide[] = [];
    const next = { ...box };

    const xEdges = [box.x, box.x + box.width / 2, box.x + box.width];
    let xShift: number | null = null;
    let xGuide = 0;

    for (const edge of xEdges) {
        const hit = nearest(edge, targets.x, scale);

        if (
            hit !== null &&
            (xShift === null || Math.abs(hit - edge) < Math.abs(xShift))
        ) {
            xShift = hit - edge;
            xGuide = hit;
        }
    }

    if (xShift !== null) {
        next.x = box.x + xShift;
        guides.push({ axis: 'x', position: xGuide });
    }

    const yEdges = [box.y, box.y + box.height / 2, box.y + box.height];
    let yShift: number | null = null;
    let yGuide = 0;

    for (const edge of yEdges) {
        const hit = nearest(edge, targets.y, scale);

        if (
            hit !== null &&
            (yShift === null || Math.abs(hit - edge) < Math.abs(yShift))
        ) {
            yShift = hit - edge;
            yGuide = hit;
        }
    }

    if (yShift !== null) {
        next.y = box.y + yShift;
        guides.push({ axis: 'y', position: yGuide });
    }

    return { box: next, guides };
}

/**
 * Apply a pointer delta to a box for the given resize handle. Snapping acts on
 * the edges the handle actually moves, so the opposite edge stays pinned.
 */
export function resizeBox(
    start: Box,
    dx: number,
    dy: number,
    handle: ResizeHandle,
    options: {
        targets?: SnapTargets;
        scale?: number;
        keepAspect?: boolean;
    } = {},
): { box: Box; guides: SnapGuide[] } {
    const { targets, scale = 1, keepAspect = false } = options;
    const guides: SnapGuide[] = [];

    let left = start.x;
    let top = start.y;
    let right = start.x + start.width;
    let bottom = start.y + start.height;

    if (handle.includes('e')) {
        right = start.x + start.width + dx;

        if (targets) {
            const hit = nearest(right, targets.x, scale);

            if (hit !== null) {
                right = hit;
                guides.push({ axis: 'x', position: hit });
            }
        }
    }

    if (handle.includes('w')) {
        left = start.x + dx;

        if (targets) {
            const hit = nearest(left, targets.x, scale);

            if (hit !== null) {
                left = hit;
                guides.push({ axis: 'x', position: hit });
            }
        }
    }

    if (handle.includes('s')) {
        bottom = start.y + start.height + dy;

        if (targets) {
            const hit = nearest(bottom, targets.y, scale);

            if (hit !== null) {
                bottom = hit;
                guides.push({ axis: 'y', position: hit });
            }
        }
    }

    if (handle.includes('n')) {
        top = start.y + dy;

        if (targets) {
            const hit = nearest(top, targets.y, scale);

            if (hit !== null) {
                top = hit;
                guides.push({ axis: 'y', position: hit });
            }
        }
    }

    let width = Math.max(MIN_ELEMENT_SIZE, right - left);
    let height = Math.max(MIN_ELEMENT_SIZE, bottom - top);

    // Shift-drag: lock to the original aspect ratio, driven by the larger change.
    if (keepAspect && start.width > 0 && start.height > 0) {
        const ratio = start.width / start.height;

        if (Math.abs(width - start.width) >= Math.abs(height - start.height)) {
            height = Math.max(MIN_ELEMENT_SIZE, width / ratio);
        } else {
            width = Math.max(MIN_ELEMENT_SIZE, height * ratio);
        }

        guides.length = 0;
    }

    return {
        box: {
            x: handle.includes('w') ? right - width : left,
            y: handle.includes('n') ? bottom - height : top,
            width,
            height,
        },
        guides,
    };
}

export function elementBox(element: CardElement): Box {
    return {
        x: element.x,
        y: element.y,
        width: element.width,
        height: element.height,
    };
}

export function roundBox(box: Box): Box {
    return {
        x: Math.round(box.x),
        y: Math.round(box.y),
        width: Math.round(box.width),
        height: Math.round(box.height),
    };
}
