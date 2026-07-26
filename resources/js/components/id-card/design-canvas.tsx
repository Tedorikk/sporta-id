import { useCallback, useEffect, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import {
    collectSnapTargets,
    elementBox,
    HANDLE_ANCHOR,
    HANDLE_CURSOR,
    resizeBox,
    RESIZE_HANDLES,
    roundBox,
    snapMove,
} from '@/components/id-card/canvas-geometry';
import type { Box, ResizeHandle, SnapGuide } from '@/components/id-card/canvas-geometry';
import { ElementContent } from '@/components/id-card/id-card-renderer';
import type { IdCardData } from '@/components/id-card/id-card-renderer';
import type { CardCanvas, CardElement } from '@/types/card-template';

interface Interaction {
    mode: 'move' | 'resize';
    handle: ResizeHandle | null;
    pointerX: number;
    pointerY: number;
    boxes: Record<string, Box>;
    moved: boolean;
}

interface DesignCanvasProps {
    canvas: CardCanvas;
    elements: CardElement[];
    data: IdCardData;
    zoom: number;
    showGrid: boolean;
    snapEnabled: boolean;
    selectedIds: string[];
    onSelect: (ids: string[]) => void;
    /** Called once when a gesture starts, so the designer can snapshot for undo. */
    onGestureStart: () => void;
    onGeometryChange: (updates: Record<string, Box>) => void;
}

export function DesignCanvas({
    canvas,
    elements,
    data,
    zoom,
    showGrid,
    snapEnabled,
    selectedIds,
    onSelect,
    onGestureStart,
    onGeometryChange,
}: DesignCanvasProps) {
    const interaction = useRef<Interaction | null>(null);
    const [active, setActive] = useState(false);
    const [guides, setGuides] = useState<SnapGuide[]>([]);
    const [hoveredId, setHoveredId] = useState<string | null>(null);

    const beginGesture = useCallback(
        (e: ReactPointerEvent, mode: 'move' | 'resize', ids: string[], handle: ResizeHandle | null) => {
            e.preventDefault();
            e.stopPropagation();

            const boxes: Record<string, Box> = {};

            for (const el of elements) {
                if (ids.includes(el.id)) {
                    boxes[el.id] = elementBox(el);
                }
            }

            // The gesture origin lives in a ref, so it survives every re-render
            // the drag itself triggers — the bug the old closure-based helpers hit.
            interaction.current = { mode, handle, pointerX: e.clientX, pointerY: e.clientY, boxes, moved: false };
            setActive(true);
        },
        [elements],
    );

    useEffect(() => {
        if (!active) {
            return;
        }

        function handleMove(e: PointerEvent) {
            const current = interaction.current;

            if (!current) {
                return;
            }

            const dx = (e.clientX - current.pointerX) / zoom;
            const dy = (e.clientY - current.pointerY) / zoom;

            if (!current.moved && Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) {
                return;
            }

            if (!current.moved) {
                current.moved = true;
                onGestureStart();
            }

            const ids = Object.keys(current.boxes);
            const targets =
                snapEnabled && !e.altKey ? collectSnapTargets(canvas, elements, ids.length === 1 ? ids[0] : null) : undefined;
            const updates: Record<string, Box> = {};
            let nextGuides: SnapGuide[] = [];

            if (current.mode === 'move') {
                // Snap using the primary element, then apply the same delta to the rest
                // so a multi-selection keeps its relative layout.
                const primaryId = ids[0];
                const primaryStart = current.boxes[primaryId];
                const moved = { ...primaryStart, x: primaryStart.x + dx, y: primaryStart.y + dy };
                const snapped = targets ? snapMove(moved, targets, zoom) : { box: moved, guides: [] };

                nextGuides = snapped.guides;

                const appliedDx = snapped.box.x - primaryStart.x;
                const appliedDy = snapped.box.y - primaryStart.y;

                for (const id of ids) {
                    const start = current.boxes[id];
                    updates[id] = roundBox({ ...start, x: start.x + appliedDx, y: start.y + appliedDy });
                }
            } else if (current.handle) {
                for (const id of ids) {
                    const result = resizeBox(current.boxes[id], dx, dy, current.handle, {
                        targets: ids.length === 1 ? targets : undefined,
                        scale: zoom,
                        keepAspect: e.shiftKey,
                    });

                    updates[id] = roundBox(result.box);
                    nextGuides = result.guides;
                }
            }

            setGuides(nextGuides);
            onGeometryChange(updates);
        }

        function handleUp() {
            interaction.current = null;
            setActive(false);
            setGuides([]);
        }

        window.addEventListener('pointermove', handleMove);
        window.addEventListener('pointerup', handleUp);
        window.addEventListener('pointercancel', handleUp);

        return () => {
            window.removeEventListener('pointermove', handleMove);
            window.removeEventListener('pointerup', handleUp);
            window.removeEventListener('pointercancel', handleUp);
        };
        // Re-subscribing when these change is harmless: the gesture origin lives
        // in `interaction.current`, which outlives any listener swap.
    }, [active, canvas, elements, zoom, snapEnabled, onGestureStart, onGeometryChange]);

    function handleElementPointerDown(e: ReactPointerEvent, element: CardElement) {
        if (element.locked || element.hidden) {
            return;
        }

        const additive = e.shiftKey || e.metaKey || e.ctrlKey;
        const alreadySelected = selectedIds.includes(element.id);

        let ids: string[];

        if (additive) {
            ids = alreadySelected ? selectedIds.filter((id) => id !== element.id) : [...selectedIds, element.id];
        } else {
            ids = alreadySelected ? selectedIds : [element.id];
        }

        onSelect(ids);

        if (ids.length > 0) {
            // Put the grabbed element first so it drives snapping.
            beginGesture(e, 'move', [element.id, ...ids.filter((id) => id !== element.id)], null);
        }
    }

    const sorted = [...elements].sort((a, b) => a.zIndex - b.zIndex);
    const showSelection = selectedIds.length > 0;
    const selectionBoxes = elements.filter((el) => selectedIds.includes(el.id));
    const singleSelection = selectionBoxes.length === 1 ? selectionBoxes[0] : null;

    return (
        <div
            className="relative"
            style={{
                width: canvas.width * zoom,
                height: canvas.height * zoom,
                flex: '0 0 auto',
            }}
        >
            <div
                onPointerDown={() => onSelect([])}
                style={{
                    position: 'absolute',
                    inset: 0,
                    width: canvas.width,
                    height: canvas.height,
                    transform: `scale(${zoom})`,
                    transformOrigin: 'top left',
                    background: canvas.background || '#ffffff',
                    boxShadow: '0 18px 50px -12px rgba(15, 23, 42, 0.35), 0 0 0 1px rgba(15, 23, 42, 0.08)',
                    borderRadius: 2,
                    touchAction: 'none',
                    cursor: active ? 'grabbing' : 'default',
                }}
            >
                {showGrid && (
                    <div
                        aria-hidden
                        style={{
                            position: 'absolute',
                            inset: 0,
                            zIndex: 0,
                            pointerEvents: 'none',
                            backgroundImage:
                                'linear-gradient(to right, rgba(37,99,235,0.10) 1px, transparent 1px), linear-gradient(to bottom, rgba(37,99,235,0.10) 1px, transparent 1px)',
                            backgroundSize: '20px 20px',
                        }}
                    />
                )}

                {sorted.map((element) => {
                    const isSelected = selectedIds.includes(element.id);
                    const isHovered = hoveredId === element.id && !isSelected && !active;

                    return (
                        <div
                            key={element.id}
                            onPointerDown={(e) => handleElementPointerDown(e, element)}
                            onPointerEnter={() => setHoveredId(element.id)}
                            onPointerLeave={() => setHoveredId((prev) => (prev === element.id ? null : prev))}
                            style={{
                                position: 'absolute',
                                left: element.x,
                                top: element.y,
                                width: element.width,
                                height: element.height,
                                zIndex: element.zIndex,
                                transform: element.rotation ? `rotate(${element.rotation}deg)` : undefined,
                                opacity: element.hidden ? 0.25 : 1,
                                cursor: element.locked ? 'default' : 'move',
                                outline: isHovered ? `${1 / zoom}px solid rgba(37, 99, 235, 0.5)` : undefined,
                            }}
                        >
                            <ElementContent element={element} data={data} />
                        </div>
                    );
                })}

                {/* Snap guides */}
                {guides.map((guide) => (
                    <div
                        key={`${guide.axis}-${guide.position}`}
                        aria-hidden
                        style={{
                            position: 'absolute',
                            zIndex: 9998,
                            pointerEvents: 'none',
                            background: '#ec4899',
                            ...(guide.axis === 'x'
                                ? { left: guide.position, top: 0, width: 1 / zoom, height: '100%' }
                                : { top: guide.position, left: 0, height: 1 / zoom, width: '100%' }),
                        }}
                    />
                ))}

                {/* Selection overlay — drawn above content so handles stay grabbable */}
                {showSelection &&
                    selectionBoxes.map((element) => (
                        <div
                            key={`sel-${element.id}`}
                            aria-hidden
                            style={{
                                position: 'absolute',
                                left: element.x,
                                top: element.y,
                                width: element.width,
                                height: element.height,
                                zIndex: 9999,
                                pointerEvents: 'none',
                                outline: `${1.5 / zoom}px solid #2563eb`,
                                outlineOffset: 0,
                            }}
                        />
                    ))}

                {singleSelection && !singleSelection.locked && (
                    <div
                        style={{
                            position: 'absolute',
                            left: singleSelection.x,
                            top: singleSelection.y,
                            width: singleSelection.width,
                            height: singleSelection.height,
                            zIndex: 10000,
                        }}
                    >
                        {RESIZE_HANDLES.map((handle) => (
                            <div
                                key={handle}
                                onPointerDown={(e) => beginGesture(e, 'resize', [singleSelection.id], handle)}
                                style={{
                                    position: 'absolute',
                                    left: HANDLE_ANCHOR[handle].left,
                                    top: HANDLE_ANCHOR[handle].top,
                                    width: 9 / zoom,
                                    height: 9 / zoom,
                                    marginLeft: -4.5 / zoom,
                                    marginTop: -4.5 / zoom,
                                    borderRadius: 9999,
                                    background: '#ffffff',
                                    border: `${1.5 / zoom}px solid #2563eb`,
                                    boxShadow: '0 1px 2px rgba(0,0,0,0.25)',
                                    cursor: HANDLE_CURSOR[handle],
                                    touchAction: 'none',
                                }}
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* Live dimension readout, kept outside the scaled layer so it stays legible */}
            {active && singleSelection && (
                <div
                    className="pointer-events-none absolute rounded bg-primary px-1.5 py-0.5 text-[11px] font-medium text-primary-foreground tabular-nums"
                    style={{
                        left: singleSelection.x * zoom,
                        top: (singleSelection.y + singleSelection.height) * zoom + 6,
                        zIndex: 10001,
                    }}
                >
                    {Math.round(singleSelection.width)} × {Math.round(singleSelection.height)}
                </div>
            )}
        </div>
    );
}
