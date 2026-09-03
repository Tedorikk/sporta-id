import type { RefObject } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import { useEffect, useState } from 'react';
import { clamp } from '@/components/id-card/color-math';

function fractionsFromEvent(
    rect: DOMRect,
    clientX: number,
    clientY: number,
): [number, number] {
    const fx =
        rect.width === 0 ? 0 : clamp((clientX - rect.left) / rect.width, 0, 1);
    const fy =
        rect.height === 0 ? 0 : clamp((clientY - rect.top) / rect.height, 0, 1);

    return [fx, fy];
}

/**
 * Drives a pointer-drag gesture confined to a container's bounding box,
 * reporting the pointer position as 0-1 fractions of the container's width
 * and height. Used by the saturation/value field, sliders, and gradient
 * stop bar — same window-listener pattern as the canvas/layers drag: the
 * effect re-subscribes whenever `onDrag` changes identity, which is cheap
 * and keeps every callback reading current props (this project's lint config
 * forbids the alternative of mirroring props into a ref written at render time).
 */
export function usePointerDrag(
    containerRef: RefObject<HTMLElement | null>,
    onDrag: (fx: number, fy: number) => void,
) {
    const [active, setActive] = useState(false);

    useEffect(() => {
        if (!active) {
            return;
        }

        function handleMove(e: PointerEvent) {
            const rect = containerRef.current?.getBoundingClientRect();

            if (!rect) {
                return;
            }

            onDrag(...fractionsFromEvent(rect, e.clientX, e.clientY));
        }

        function handleUp() {
            setActive(false);
        }

        window.addEventListener('pointermove', handleMove);
        window.addEventListener('pointerup', handleUp);
        window.addEventListener('pointercancel', handleUp);

        return () => {
            window.removeEventListener('pointermove', handleMove);
            window.removeEventListener('pointerup', handleUp);
            window.removeEventListener('pointercancel', handleUp);
        };
    }, [active, containerRef, onDrag]);

    function onPointerDown(e: ReactPointerEvent) {
        e.preventDefault();
        const rect = containerRef.current?.getBoundingClientRect();

        if (!rect) {
            return;
        }

        onDrag(...fractionsFromEvent(rect, e.clientX, e.clientY));
        setActive(true);
    }

    return { onPointerDown, active };
}
