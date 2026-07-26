import type { PointerEvent as ReactPointerEvent } from 'react';

export interface Box {
    x: number;
    y: number;
    width: number;
    height: number;
}

export type ResizeHandle = 'nw' | 'ne' | 'sw' | 'se';

interface PointerHandlers {
    onPointerDown: (e: ReactPointerEvent) => void;
    onPointerMove: (e: ReactPointerEvent) => void;
    onPointerUp: (e: ReactPointerEvent) => void;
}

/**
 * Plain closures (not hooks) so they can be freely created per-element inside
 * a .map() without tripping the rules of hooks — each call owns its own
 * `start` state via closure, not useRef.
 */
export function makeDragHandlers(getBox: () => Box, onChange: (box: Box) => void): PointerHandlers {
    let start: { pointerX: number; pointerY: number; box: Box } | null = null;

    return {
        onPointerDown: (e) => {
            e.stopPropagation();
            (e.currentTarget as Element).setPointerCapture(e.pointerId);
            start = { pointerX: e.clientX, pointerY: e.clientY, box: getBox() };
        },
        onPointerMove: (e) => {
            if (!start) {
                return;
            }

            const dx = e.clientX - start.pointerX;
            const dy = e.clientY - start.pointerY;

            onChange({ ...start.box, x: start.box.x + dx, y: start.box.y + dy });
        },
        onPointerUp: () => {
            start = null;
        },
    };
}

export function makeResizeHandlers(getBox: () => Box, handle: ResizeHandle, onChange: (box: Box) => void, minSize = 16): PointerHandlers {
    let start: { pointerX: number; pointerY: number; box: Box } | null = null;

    return {
        onPointerDown: (e) => {
            e.stopPropagation();
            (e.currentTarget as Element).setPointerCapture(e.pointerId);
            start = { pointerX: e.clientX, pointerY: e.clientY, box: getBox() };
        },
        onPointerMove: (e) => {
            if (!start) {
                return;
            }

            const dx = e.clientX - start.pointerX;
            const dy = e.clientY - start.pointerY;
            const b = start.box;
            const next = { ...b };

            if (handle.includes('e')) {
                next.width = Math.max(minSize, b.width + dx);
            }

            if (handle.includes('s')) {
                next.height = Math.max(minSize, b.height + dy);
            }

            if (handle.includes('w')) {
                next.width = Math.max(minSize, b.width - dx);
                next.x = b.x + (b.width - next.width);
            }

            if (handle.includes('n')) {
                next.height = Math.max(minSize, b.height - dy);
                next.y = b.y + (b.height - next.height);
            }

            onChange(next);
        },
        onPointerUp: () => {
            start = null;
        },
    };
}
