import {
    ArrowDown,
    ArrowUp,
    Copy,
    Eye,
    EyeOff,
    GripVertical,
    Image as ImageIcon,
    Lock,
    MoreVertical,
    QrCode,
    Square,
    Trash2,
    Type,
    Unlock,
} from 'lucide-react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import type { CardElement, CardElementKind, CardSubjectType } from '@/types/card-template';
import { bindingLabel } from '@/types/card-template';

const KIND_ICON: Record<CardElementKind, typeof Type> = {
    text: Type,
    image: ImageIcon,
    qr: QrCode,
    shape: Square,
};

/** Fixed row height in px — every row is rendered at exactly this height so drag
 *  math (which slot the pointer is over) never has to measure the DOM. */
const ROW_HEIGHT = 34;

export function elementDisplayName(element: CardElement, subjectType: CardSubjectType): string {
    if (element.name) {
        return element.name;
    }

    if (element.binding) {
        return bindingLabel(subjectType, element.binding);
    }

    if (element.kind === 'text') {
        return element.staticText?.trim().split('\n')[0] || 'Text';
    }

    return element.kind === 'qr' ? 'QR code' : element.kind === 'image' ? 'Image' : 'Shape';
}

function moveItem<T>(list: T[], fromIndex: number, toIndex: number): T[] {
    const next = [...list];
    const [item] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, item);

    return next;
}

interface LayersPanelProps {
    elements: CardElement[];
    subjectType: CardSubjectType;
    selectedIds: string[];
    onSelect: (ids: string[]) => void;
    onToggle: (id: string, patch: Partial<CardElement>) => void;
    onReorder: (id: string, direction: 'up' | 'down' | 'front' | 'back') => void;
    /** Commits a full topmost-first id order, e.g. after a drag gesture ends. */
    onReorderAll: (orderedIdsTopFirst: string[]) => void;
    onDuplicate: (ids: string[]) => void;
    onDelete: (ids: string[]) => void;
}

interface DragState {
    id: string;
    originIndex: number;
    /** Distance from the row's top edge to where the pointer grabbed it, so the row doesn't jump under the cursor. */
    grabOffsetY: number;
    containerTop: number;
}

export function LayersPanel({
    elements,
    subjectType,
    selectedIds,
    onSelect,
    onToggle,
    onReorder,
    onReorderAll,
    onDuplicate,
    onDelete,
}: LayersPanelProps) {
    // Topmost first, matching what the eye sees on the canvas — this is the
    // stable base order a drag gesture starts from and reorders relative to.
    const ordered = [...elements].sort((a, b) => b.zIndex - a.zIndex);
    const baseIds = ordered.map((el) => el.id);

    const containerRef = useRef<HTMLUListElement>(null);
    const drag = useRef<DragState | null>(null);
    const [draggingId, setDraggingId] = useState<string | null>(null);
    const [visualOrder, setVisualOrder] = useState<string[]>(baseIds);
    const [followTranslate, setFollowTranslate] = useState(0);

    // Deliberately not a useCallback: it must always see the current render's
    // `baseIds`, and re-creating a plain pointerdown handler every render is free.
    function beginDrag(e: ReactPointerEvent, id: string) {
        if (e.button !== 0) {
            return;
        }

        e.preventDefault();
        e.stopPropagation();

        const container = containerRef.current;
        const row = e.currentTarget.closest('[data-layer-row]') as HTMLElement | null;

        if (!container || !row) {
            return;
        }

        drag.current = {
            id,
            originIndex: baseIds.indexOf(id),
            grabOffsetY: e.clientY - row.getBoundingClientRect().top,
            containerTop: container.getBoundingClientRect().top,
        };

        setDraggingId(id);
        setVisualOrder(baseIds);
        setFollowTranslate(0);
    }

    useEffect(() => {
        if (!draggingId) {
            return;
        }

        function handleMove(e: PointerEvent) {
            const state = drag.current;

            if (!state) {
                return;
            }

            const maxTop = (baseIds.length - 1) * ROW_HEIGHT;
            const rawTop = e.clientY - state.containerTop - state.grabOffsetY;
            const clampedTop = Math.min(maxTop, Math.max(0, rawTop));

            setFollowTranslate(clampedTop - state.originIndex * ROW_HEIGHT);

            const targetIndex = Math.min(baseIds.length - 1, Math.max(0, Math.round(clampedTop / ROW_HEIGHT)));

            setVisualOrder((prev) => {
                const currentIndex = prev.indexOf(state.id);

                if (currentIndex === targetIndex) {
                    return prev;
                }

                return moveItem(baseIds, state.originIndex, targetIndex);
            });
        }

        function handleUp() {
            const state = drag.current;

            if (state) {
                setVisualOrder((finalOrder) => {
                    if (finalOrder.join() !== baseIds.join()) {
                        onReorderAll(finalOrder);
                    }

                    return finalOrder;
                });
            }

            drag.current = null;
            setDraggingId(null);
        }

        window.addEventListener('pointermove', handleMove);
        window.addEventListener('pointerup', handleUp);
        window.addEventListener('pointercancel', handleUp);

        return () => {
            window.removeEventListener('pointermove', handleMove);
            window.removeEventListener('pointerup', handleUp);
            window.removeEventListener('pointercancel', handleUp);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [draggingId]);

    if (ordered.length === 0) {
        return (
            <p className="px-3 py-6 text-center text-xs text-muted-foreground">
                No layers yet. Add an element above to get started.
            </p>
        );
    }

    return (
        <ul ref={containerRef} className="relative p-1.5" style={{ height: ordered.length * ROW_HEIGHT + 12 }}>
            {ordered.map((element, originalIndex) => {
                const Icon = KIND_ICON[element.kind];
                const isSelected = selectedIds.includes(element.id);
                const isDragging = draggingId === element.id;
                const visualIndex = visualOrder.indexOf(element.id);
                const shiftTranslate = (visualIndex - originalIndex) * ROW_HEIGHT;

                return (
                    <li
                        key={element.id}
                        data-layer-row
                        style={{
                            position: 'absolute',
                            top: 6 + originalIndex * ROW_HEIGHT,
                            left: 6,
                            right: 6,
                            height: ROW_HEIGHT,
                            transform: `translateY(${isDragging ? followTranslate : shiftTranslate}px)`,
                            transition: isDragging ? 'none' : 'transform 150ms cubic-bezier(0.2, 0, 0, 1)',
                            zIndex: isDragging ? 10 : 1,
                        }}
                    >
                        <div
                            role="button"
                            tabIndex={0}
                            onClick={(e) => onSelect(e.shiftKey || e.metaKey || e.ctrlKey ? toggleId(selectedIds, element.id) : [element.id])}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault();
                                    onSelect([element.id]);
                                }
                            }}
                            className={cn(
                                'group flex h-full w-full items-center gap-1.5 rounded-md pr-2 pl-1 text-left text-sm transition-colors',
                                isSelected ? 'bg-primary/10 text-primary' : 'hover:bg-muted',
                                element.hidden && 'opacity-50',
                                isDragging && 'bg-background shadow-md ring-1 ring-border',
                            )}
                        >
                            <button
                                type="button"
                                aria-label="Drag to reorder"
                                onPointerDown={(e) => beginDrag(e, element.id)}
                                className="shrink-0 touch-none rounded p-0.5 text-muted-foreground/50 hover:text-foreground active:cursor-grabbing"
                                style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
                            >
                                <GripVertical className="h-3.5 w-3.5" />
                            </button>

                            <Icon className="h-3.5 w-3.5 shrink-0 opacity-70" />

                            <span className="min-w-0 flex-1 truncate text-xs">{elementDisplayName(element, subjectType)}</span>

                            <button
                                type="button"
                                aria-label={element.hidden ? 'Show layer' : 'Hide layer'}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onToggle(element.id, { hidden: !element.hidden });
                                }}
                                className={cn(
                                    'rounded p-0.5 text-muted-foreground hover:text-foreground',
                                    !element.hidden && 'opacity-0 group-hover:opacity-100 focus-visible:opacity-100',
                                )}
                            >
                                {element.hidden ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                            </button>

                            <button
                                type="button"
                                aria-label={element.locked ? 'Unlock layer' : 'Lock layer'}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onToggle(element.id, { locked: !element.locked });
                                }}
                                className={cn(
                                    'rounded p-0.5 text-muted-foreground hover:text-foreground',
                                    !element.locked && 'opacity-0 group-hover:opacity-100 focus-visible:opacity-100',
                                )}
                            >
                                {element.locked ? <Lock className="h-3.5 w-3.5" /> : <Unlock className="h-3.5 w-3.5" />}
                            </button>

                            <DropdownMenu>
                                <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        aria-label="Layer actions"
                                        className="h-5 w-5 shrink-0 text-muted-foreground opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
                                    >
                                        <MoreVertical className="h-3.5 w-3.5" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-44">
                                    <DropdownMenuItem onClick={() => onReorder(element.id, 'front')}>
                                        <ArrowUp className="h-4 w-4" /> Bring to front
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => onReorder(element.id, 'up')}>
                                        <ArrowUp className="h-4 w-4" /> Bring forward
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => onReorder(element.id, 'down')}>
                                        <ArrowDown className="h-4 w-4" /> Send backward
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => onReorder(element.id, 'back')}>
                                        <ArrowDown className="h-4 w-4" /> Send to back
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={() => onDuplicate([element.id])}>
                                        <Copy className="h-4 w-4" /> Duplicate
                                    </DropdownMenuItem>
                                    <DropdownMenuItem variant="destructive" onClick={() => onDelete([element.id])}>
                                        <Trash2 className="h-4 w-4" /> Delete
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    </li>
                );
            })}
        </ul>
    );
}

function toggleId(ids: string[], id: string): string[] {
    return ids.includes(id) ? ids.filter((existing) => existing !== id) : [...ids, id];
}
