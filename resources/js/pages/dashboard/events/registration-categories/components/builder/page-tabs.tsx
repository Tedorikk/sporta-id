import {
    DndContext,
    PointerSensor,
    closestCenter,
    useSensor,
    useSensors,
} from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import {
    SortableContext,
    arrayMove,
    horizontalListSortingStrategy,
    useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import type { DraftField } from './field-list';

export interface DraftPage {
    _uid: string;
    key: string;
    title: string;
    description?: string | null;
    fields: DraftField[];
}

interface PageTabsProps {
    pages: DraftPage[];
    activeUid: string;
    onSelect: (uid: string) => void;
    onChange: (pages: DraftPage[]) => void;
    onAdd: () => void;
}

export function PageTabs({
    pages,
    activeUid,
    onSelect,
    onChange,
    onAdd,
}: PageTabsProps) {
    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    );

    function handleDragEnd(event: DragEndEvent) {
        const { active, over } = event;

        if (!over || active.id === over.id) {
            return;
        }

        const oldIndex = pages.findIndex((p) => p._uid === active.id);
        const newIndex = pages.findIndex((p) => p._uid === over.id);

        onChange(arrayMove(pages, oldIndex, newIndex));
    }

    function renamePage(uid: string, title: string) {
        onChange(pages.map((p) => (p._uid === uid ? { ...p, title } : p)));
    }

    function removePage(uid: string) {
        if (pages.length <= 1) {
            return;
        }

        const next = pages.filter((p) => p._uid !== uid);
        onChange(next);

        if (activeUid === uid) {
            onSelect(next[0]._uid);
        }
    }

    return (
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
            <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
            >
                <SortableContext
                    items={pages.map((p) => p._uid)}
                    strategy={horizontalListSortingStrategy}
                >
                    <div className="flex items-center gap-1.5">
                        {pages.map((page, index) => (
                            <SortablePageTab
                                key={page._uid}
                                page={page}
                                index={index}
                                active={page._uid === activeUid}
                                canRemove={pages.length > 1}
                                onSelect={() => onSelect(page._uid)}
                                onRename={(title) =>
                                    renamePage(page._uid, title)
                                }
                                onRemove={() => removePage(page._uid)}
                            />
                        ))}
                    </div>
                </SortableContext>
            </DndContext>

            <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onAdd}
                className="shrink-0"
            >
                <Plus className="mr-1 h-3.5 w-3.5" />
                Page
            </Button>
        </div>
    );
}

function SortablePageTab({
    page,
    index,
    active,
    canRemove,
    onSelect,
    onRename,
    onRemove,
}: {
    page: DraftPage;
    index: number;
    active: boolean;
    canRemove: boolean;
    onSelect: () => void;
    onRename: (title: string) => void;
    onRemove: () => void;
}) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: page._uid });
    const style = { transform: CSS.Transform.toString(transform), transition };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={cn(
                'flex shrink-0 items-center gap-1 rounded-md border px-2 py-1.5',
                active
                    ? 'border-primary bg-primary/5'
                    : 'border-transparent bg-muted/50 hover:bg-muted',
                isDragging && 'opacity-60 shadow-lg',
            )}
        >
            <button
                type="button"
                {...attributes}
                {...listeners}
                className="cursor-grab touch-none text-muted-foreground active:cursor-grabbing"
                aria-label="Drag to reorder page"
            >
                <GripVertical className="h-3.5 w-3.5" />
            </button>

            <button
                type="button"
                onClick={onSelect}
                className="text-xs font-medium text-muted-foreground"
            >
                {index + 1}.
            </button>

            <Input
                value={page.title}
                onChange={(e) => onRename(e.target.value)}
                onFocus={onSelect}
                className="h-6 w-28 border-none bg-transparent px-1 text-sm shadow-none focus-visible:ring-1"
            />

            {canRemove && (
                <button
                    type="button"
                    onClick={onRemove}
                    className="text-muted-foreground hover:text-destructive"
                    aria-label="Delete page"
                >
                    <X className="h-3.5 w-3.5" />
                </button>
            )}
        </div>
    );
}
