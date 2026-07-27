import { useCallback, useMemo, useState } from 'react';
import type { CardCanvas, CardElement, CardElementKind, CardElementStyle } from '@/types/card-template';

export interface DesignerState {
    canvas: CardCanvas;
    elements: CardElement[];
}

interface Store {
    present: DesignerState;
    past: DesignerState[];
    future: DesignerState[];
    /** Serialized snapshot of the last saved state, for the dirty indicator. */
    saved: string;
}

const HISTORY_LIMIT = 60;

function serialize(state: DesignerState): string {
    return JSON.stringify(state);
}

/**
 * Elements come back from the API as raw JSON, where an empty PHP array casts
 * to `[]` rather than `{}` and optional keys may be missing entirely. Normalise
 * once on load so every consumer can assume a well-formed shape.
 */
export function normalizeElement(element: CardElement, index: number): CardElement {
    const style = (Array.isArray(element.style) || !element.style ? {} : element.style) as CardElementStyle;

    return {
        ...element,
        x: Number(element.x) || 0,
        y: Number(element.y) || 0,
        width: Number(element.width) || 1,
        height: Number(element.height) || 1,
        rotation: Number(element.rotation) || 0,
        zIndex: Number(element.zIndex) || index + 1,
        binding: element.binding ?? null,
        locked: element.locked ?? false,
        hidden: element.hidden ?? false,
        style,
    };
}

function makeId(): string {
    return `el_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

/** Nudges repeated additions so they don't land exactly on top of one another — wraps every 8 adds. */
const CASCADE_STEP = 16;
const CASCADE_WRAP = 8;

function cascadeOffset(addIndex: number): number {
    return (addIndex % CASCADE_WRAP) * CASCADE_STEP;
}

/** Centers a new element horizontally, applies the cascade offset, and keeps it fully on-canvas. */
function place(width: number, height: number, canvas: CardCanvas, offset: number): { x: number; y: number } {
    const x = Math.round((canvas.width - width) / 2) + offset;
    const y = 40 + offset;

    return {
        x: Math.max(0, Math.min(x, canvas.width - width)),
        y: Math.max(0, Math.min(y, canvas.height - height)),
    };
}

export function newElement(kind: CardElementKind, zIndex: number, canvas: CardCanvas, addIndex = 0): CardElement {
    const base = { id: makeId(), zIndex, rotation: 0, locked: false, hidden: false };
    const offset = cascadeOffset(addIndex);

    if (kind === 'text') {
        const width = Math.min(240, canvas.width - 40);
        const height = 32;

        return {
            ...base,
            kind,
            binding: null,
            ...place(width, height, canvas, offset),
            width,
            height,
            staticText: 'New text',
            style: { fontSize: 16, fontWeight: 500, textAlign: 'center', verticalAlign: 'middle', color: '#0f172a' },
        };
    }

    if (kind === 'qr') {
        const size = Math.min(160, canvas.width - 40);

        return {
            ...base,
            kind,
            binding: 'qrDataUrl',
            ...place(size, size, canvas, offset),
            width: size,
            height: size,
            style: { borderRadius: 8, objectFit: 'contain' },
        };
    }

    if (kind === 'image') {
        const size = Math.min(120, canvas.width - 40);

        return {
            ...base,
            kind,
            binding: 'photo',
            ...place(size, size, canvas, offset),
            width: size,
            height: size,
            style: { borderRadius: 12, objectFit: 'cover', background: '#e2e8f0' },
        };
    }

    const width = Math.min(canvas.width - 40, 300);
    const height = 48;

    return {
        ...base,
        kind,
        binding: null,
        ...place(width, height, canvas, offset),
        width,
        height,
        style: { background: '#e2e8f0', borderRadius: 8 },
    };
}

function pushPast(store: Store, next: DesignerState): Store {
    return {
        present: next,
        past: [...store.past, store.present].slice(-HISTORY_LIMIT),
        future: [],
        saved: store.saved,
    };
}

/**
 * Undo/redo history and the design itself live in one store so every mutator can
 * be a dependency-free functional update. That keeps the callbacks stable, which
 * matters because the canvas reads them from inside a live pointer gesture.
 */
export function useCardDesigner(initial: DesignerState) {
    const [store, setStore] = useState<Store>(() => ({
        present: initial,
        past: [],
        future: [],
        saved: serialize(initial),
    }));

    const [selectedIds, setSelectedIds] = useState<string[]>([]);

    /** Snapshot the current design so the *next* mutation becomes one undo step. */
    const pushHistory = useCallback(() => {
        setStore((prev) => pushPast(prev, prev.present));
    }, []);

    const update = useCallback(
        (patch: (prev: DesignerState) => Partial<DesignerState>, options: { history?: boolean } = {}) => {
            setStore((prev) => {
                const next = { ...prev.present, ...patch(prev.present) };

                if (options.history === false) {
                    return { ...prev, present: next };
                }

                return pushPast(prev, next);
            });
        },
        [],
    );

    const setElements = useCallback(
        (updater: (prev: CardElement[]) => CardElement[], options: { history?: boolean } = {}) => {
            update((prev) => ({ elements: updater(prev.elements) }), options);
        },
        [update],
    );

    const updateElement = useCallback(
        (id: string, patch: Partial<CardElement>, options: { history?: boolean } = {}) => {
            setElements((prev) => prev.map((el) => (el.id === id ? { ...el, ...patch } : el)), options);
        },
        [setElements],
    );

    const updateStyle = useCallback(
        (id: string, patch: Partial<CardElementStyle>, options: { history?: boolean } = {}) => {
            setElements((prev) => prev.map((el) => (el.id === id ? { ...el, style: { ...el.style, ...patch } } : el)), options);
        },
        [setElements],
    );

    const setCanvas = useCallback(
        (patch: Partial<CardCanvas>, options: { history?: boolean } = {}) => {
            update((prev) => ({ canvas: { ...prev.canvas, ...patch } }), options);
        },
        [update],
    );

    const addElement = useCallback((kind: CardElementKind, overrides: Partial<CardElement> = {}) => {
        const id = overrides.id ?? makeId();

        setStore((prev) => {
            const maxZ = prev.present.elements.reduce((max, el) => Math.max(max, el.zIndex), 0);
            const sameKindCount = prev.present.elements.filter((el) => el.kind === kind).length;
            const element = { ...newElement(kind, maxZ + 1, prev.present.canvas, sameKindCount), ...overrides, id };

            return pushPast(prev, { ...prev.present, elements: [...prev.present.elements, element] });
        });

        setSelectedIds([id]);
    }, []);

    const removeElements = useCallback(
        (ids: string[]) => {
            if (ids.length === 0) {
                return;
            }

            setElements((prev) => prev.filter((el) => !ids.includes(el.id)));
            setSelectedIds((prev) => prev.filter((id) => !ids.includes(id)));
        },
        [setElements],
    );

    const duplicateElements = useCallback((ids: string[]) => {
        if (ids.length === 0) {
            return;
        }

        const newIds = ids.map(() => makeId());

        setStore((prev) => {
            const source = prev.present.elements.filter((el) => ids.includes(el.id));

            if (source.length === 0) {
                return prev;
            }

            let z = prev.present.elements.reduce((max, el) => Math.max(max, el.zIndex), 0);

            const copies = source.map((el, i) => ({
                ...el,
                id: newIds[i],
                x: el.x + 12,
                y: el.y + 12,
                zIndex: ++z,
            }));

            return pushPast(prev, { ...prev.present, elements: [...prev.present.elements, ...copies] });
        });

        setSelectedIds(newIds);
    }, []);

    /** Move an element through the z-order by rewriting zIndex from the sorted order. */
    const reorder = useCallback(
        (id: string, direction: 'up' | 'down' | 'front' | 'back') => {
            setElements((prev) => {
                const sorted = [...prev].sort((a, b) => a.zIndex - b.zIndex);
                const index = sorted.findIndex((el) => el.id === id);

                if (index === -1) {
                    return prev;
                }

                const [moved] = sorted.splice(index, 1);
                const target =
                    direction === 'up' ? Math.min(sorted.length, index + 1)
                    : direction === 'down' ? Math.max(0, index - 1)
                    : direction === 'front' ? sorted.length
                    : 0;

                sorted.splice(target, 0, moved);

                return sorted.map((el, i) => ({ ...el, zIndex: i + 1 }));
            });
        },
        [setElements],
    );

    /**
     * Apply a full topmost-first order (as shown in the layers panel) by
     * rewriting zIndex for exactly those ids — anything not listed keeps its
     * zIndex untouched. One history entry per call, so a drag-to-reorder
     * gesture collapses to a single undo step.
     */
    const reorderAll = useCallback(
        (orderedIdsTopFirst: string[]) => {
            setElements((prev) => {
                const zByIndex = new Map(orderedIdsTopFirst.map((id, i) => [id, orderedIdsTopFirst.length - i]));

                return prev.map((el) => (zByIndex.has(el.id) ? { ...el, zIndex: zByIndex.get(el.id)! } : el));
            });
        },
        [setElements],
    );

    const undo = useCallback(() => {
        setStore((prev) => {
            const previous = prev.past.at(-1);

            if (!previous) {
                return prev;
            }

            return {
                present: previous,
                past: prev.past.slice(0, -1),
                future: [prev.present, ...prev.future],
                saved: prev.saved,
            };
        });
    }, []);

    const redo = useCallback(() => {
        setStore((prev) => {
            const next = prev.future[0];

            if (!next) {
                return prev;
            }

            return {
                present: next,
                past: [...prev.past, prev.present],
                future: prev.future.slice(1),
                saved: prev.saved,
            };
        });
    }, []);

    const replaceAll = useCallback((next: DesignerState) => {
        setStore((prev) => pushPast(prev, next));
    }, []);

    const markSaved = useCallback(() => {
        setStore((prev) => ({ ...prev, saved: serialize(prev.present) }));
    }, []);

    const { canvas, elements } = store.present;

    const selectedElements = useMemo(
        () => elements.filter((el) => selectedIds.includes(el.id)),
        [elements, selectedIds],
    );

    return {
        canvas,
        elements,
        state: store.present,
        selectedIds,
        setSelectedIds,
        selectedElements,
        selected: selectedElements.length === 1 ? selectedElements[0] : null,
        setCanvas,
        setElements,
        updateElement,
        updateStyle,
        addElement,
        removeElements,
        duplicateElements,
        reorder,
        reorderAll,
        pushHistory,
        undo,
        redo,
        replaceAll,
        canUndo: store.past.length > 0,
        canRedo: store.future.length > 0,
        isDirty: serialize(store.present) !== store.saved,
        markSaved,
    };
}

export type CardDesigner = ReturnType<typeof useCardDesigner>;
