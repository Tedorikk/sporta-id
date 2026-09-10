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
    useSortable,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { AlertCircle, GripVertical, List, Plus, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Field, FieldDescription, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

interface OptionRow {
    id: string;
    value: string;
}

interface OptionEditorProps {
    options: string[];
    onChange: (options: string[]) => void;
}

function rowId() {
    return crypto.randomUUID();
}

function toRows(values: string[]): OptionRow[] {
    return values.map((value) => ({ id: rowId(), value }));
}

function sameValues(a: string[], b: string[]) {
    return a.length === b.length && a.every((value, i) => value === b[i]);
}

/**
 * Values that appear more than once, compared case-insensitively and ignoring
 * surrounding whitespace — the way a respondent would read them.
 */
function duplicateValues(values: string[]): Set<string> {
    const seen = new Set<string>();
    const duplicates = new Set<string>();

    values.forEach((value) => {
        const normalized = value.trim().toLowerCase();

        if (!normalized) {
            return;
        }

        if (seen.has(normalized)) {
            duplicates.add(normalized);
        }

        seen.add(normalized);
    });

    return duplicates;
}

export function OptionEditor({ options, onChange }: OptionEditorProps) {
    const [rows, setRows] = useState<OptionRow[]>(() => toRows(options));
    const [bulkDraft, setBulkDraft] = useState<string | null>(null);
    const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
    const pendingFocus = useRef<number | null>(null);
    // What we last handed the parent, so an echo of our own change doesn't
    // rebuild the rows and lose row identity mid-edit.
    const lastEmitted = useRef<string[]>(options);

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    );

    useEffect(() => {
        if (sameValues(options, lastEmitted.current)) {
            return;
        }

        lastEmitted.current = options;
        setRows(toRows(options));
    }, [options]);

    useEffect(() => {
        if (pendingFocus.current === null) {
            return;
        }

        inputRefs.current[pendingFocus.current]?.focus();
        pendingFocus.current = null;
    });

    function commit(next: OptionRow[]) {
        const values = next.map((row) => row.value);

        setRows(next);
        lastEmitted.current = values;
        onChange(values);
    }

    function updateAt(index: number, value: string) {
        commit(rows.map((row, i) => (i === index ? { ...row, value } : row)));
    }

    function insertAt(index: number, values: string[] = ['']) {
        const next = [...rows];

        next.splice(index, 0, ...toRows(values));
        pendingFocus.current = index + values.length - 1;
        commit(next);
    }

    function removeAt(index: number) {
        pendingFocus.current = Math.max(0, index - 1);
        commit(rows.filter((_, i) => i !== index));
    }

    function handleDragEnd(event: DragEndEvent) {
        const { active, over } = event;

        if (!over || active.id === over.id) {
            return;
        }

        const from = rows.findIndex((row) => row.id === active.id);
        const to = rows.findIndex((row) => row.id === over.id);

        commit(arrayMove(rows, from, to));
    }

    function handleBulkChange(text: string) {
        setBulkDraft(text);
        commit(
            toRows(
                text
                    .split('\n')
                    .map((line) => line.trim())
                    .filter(Boolean),
            ),
        );
    }

    const duplicates = duplicateValues(rows.map((row) => row.value));
    const blankCount = rows.filter((row) => !row.value.trim()).length;

    if (bulkDraft !== null) {
        return (
            <Field>
                <div className="flex items-center justify-between">
                    <FieldLabel>Options</FieldLabel>
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs"
                        onClick={() => setBulkDraft(null)}
                    >
                        Done
                    </Button>
                </div>
                <FieldDescription>
                    One option per line. Blank lines are dropped.
                </FieldDescription>
                <Textarea
                    autoFocus
                    value={bulkDraft}
                    onChange={(e) => handleBulkChange(e.target.value)}
                    placeholder={'Small\nMedium\nLarge'}
                    className="min-h-32 font-mono text-xs"
                />
            </Field>
        );
    }

    return (
        <Field>
            <div className="flex items-center justify-between">
                <FieldLabel>
                    Options{' '}
                    <span className="font-normal text-muted-foreground">
                        ({rows.length})
                    </span>
                </FieldLabel>
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs"
                    onClick={() =>
                        setBulkDraft(rows.map((row) => row.value).join('\n'))
                    }
                >
                    <List className="mr-1 h-3.5 w-3.5" />
                    Bulk edit
                </Button>
            </div>

            {rows.length === 0 ? (
                <p className="rounded-md border border-dashed py-4 text-center text-xs text-muted-foreground">
                    No options yet — respondents would see an empty list.
                </p>
            ) : (
                <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                >
                    <SortableContext
                        items={rows.map((row) => row.id)}
                        strategy={verticalListSortingStrategy}
                    >
                        <div className="space-y-1.5">
                            {rows.map((row, index) => (
                                <OptionRowItem
                                    key={row.id}
                                    row={row}
                                    index={index}
                                    isDuplicate={duplicates.has(
                                        row.value.trim().toLowerCase(),
                                    )}
                                    canRemove={rows.length > 1}
                                    inputRef={(el) => {
                                        inputRefs.current[index] = el;
                                    }}
                                    onChange={(value) => updateAt(index, value)}
                                    onEnter={() => insertAt(index + 1)}
                                    onBackspaceEmpty={() => removeAt(index)}
                                    onFocusSibling={(offset) =>
                                        inputRefs.current[
                                            index + offset
                                        ]?.focus()
                                    }
                                    onPasteLines={(lines) =>
                                        insertAt(index + 1, lines)
                                    }
                                    onRemove={() => removeAt(index)}
                                />
                            ))}
                        </div>
                    </SortableContext>
                </DndContext>
            )}

            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8"
                    onClick={() => insertAt(rows.length)}
                >
                    <Plus className="mr-1 h-3.5 w-3.5" />
                    Add option
                </Button>
                {rows.length > 0 && (
                    <span className="text-xs text-muted-foreground">
                        Press Enter to add the next one
                    </span>
                )}
            </div>

            {(duplicates.size > 0 || blankCount > 0) && (
                <p className="flex items-start gap-1.5 text-xs text-amber-600 dark:text-amber-500">
                    <AlertCircle className="mt-px h-3.5 w-3.5 shrink-0" />
                    {duplicates.size > 0
                        ? 'Duplicate options are highlighted — respondents cannot tell them apart.'
                        : `${blankCount} blank ${blankCount === 1 ? 'option is' : 'options are'} dropped when you save.`}
                </p>
            )}
        </Field>
    );
}

function OptionRowItem({
    row,
    index,
    isDuplicate,
    canRemove,
    inputRef,
    onChange,
    onEnter,
    onBackspaceEmpty,
    onFocusSibling,
    onPasteLines,
    onRemove,
}: {
    row: OptionRow;
    index: number;
    isDuplicate: boolean;
    canRemove: boolean;
    inputRef: (el: HTMLInputElement | null) => void;
    onChange: (value: string) => void;
    onEnter: () => void;
    onBackspaceEmpty: () => void;
    onFocusSibling: (offset: number) => void;
    onPasteLines: (lines: string[]) => void;
    onRemove: () => void;
}) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: row.id });

    const style = { transform: CSS.Transform.toString(transform), transition };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={cn(
                'flex items-center gap-1.5 rounded-md',
                isDragging && 'bg-background opacity-70 shadow-lg',
            )}
        >
            <button
                type="button"
                {...attributes}
                {...listeners}
                className="cursor-grab touch-none text-muted-foreground hover:text-foreground active:cursor-grabbing"
                aria-label={`Reorder option ${index + 1}`}
            >
                <GripVertical className="h-4 w-4" />
            </button>

            <Input
                ref={inputRef}
                value={row.value}
                onChange={(e) => onChange(e.target.value)}
                onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        onEnter();
                    } else if (
                        e.key === 'Backspace' &&
                        row.value === '' &&
                        canRemove
                    ) {
                        e.preventDefault();
                        onBackspaceEmpty();
                    } else if (e.key === 'ArrowDown') {
                        e.preventDefault();
                        onFocusSibling(1);
                    } else if (e.key === 'ArrowUp') {
                        e.preventDefault();
                        onFocusSibling(-1);
                    }
                }}
                onPaste={(e) => {
                    const text = e.clipboardData.getData('text');

                    if (!text.includes('\n')) {
                        return;
                    }

                    const lines = text
                        .split('\n')
                        .map((line) => line.trim())
                        .filter(Boolean);

                    if (lines.length < 2) {
                        return;
                    }

                    e.preventDefault();
                    onChange(lines[0]);
                    onPasteLines(lines.slice(1));
                }}
                placeholder={`Option ${index + 1}`}
                aria-label={`Option ${index + 1}`}
                className={cn(
                    'h-8',
                    isDuplicate &&
                        'border-amber-500 focus-visible:border-amber-500',
                )}
            />

            <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                onClick={onRemove}
                disabled={!canRemove}
                aria-label={`Remove option ${index + 1}`}
            >
                <X className="h-3.5 w-3.5" />
            </Button>
        </div>
    );
}
