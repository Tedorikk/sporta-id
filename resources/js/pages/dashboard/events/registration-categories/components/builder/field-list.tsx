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
import { ChevronDown, ChevronUp, GripVertical, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import {
    OPTION_FIELD_TYPES,
    REGISTRATION_FIELD_TYPES,
    RESERVED_FIELD_KEYS,
    isInputField,
} from '@/types/registration-category';
import type { RegistrationField } from '@/types/registration-category';
import { OptionEditor } from './option-editor';

export interface DraftField extends RegistrationField {
    _uid: string;
}

interface FieldListProps {
    fields: DraftField[];
    onChange: (fields: DraftField[]) => void;
}

export function FieldList({ fields, onChange }: FieldListProps) {
    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    );

    function handleDragEnd(event: DragEndEvent) {
        const { active, over } = event;

        if (!over || active.id === over.id) {
            return;
        }

        const oldIndex = fields.findIndex((f) => f._uid === active.id);
        const newIndex = fields.findIndex((f) => f._uid === over.id);

        onChange(arrayMove(fields, oldIndex, newIndex));
    }

    function updateField(uid: string, patch: Partial<DraftField>) {
        onChange(fields.map((f) => (f._uid === uid ? { ...f, ...patch } : f)));
    }

    function removeField(uid: string) {
        onChange(fields.filter((f) => f._uid !== uid));
    }

    if (fields.length === 0) {
        return (
            <p className="rounded-md border border-dashed py-8 text-center text-sm text-muted-foreground">
                No fields of your own on this page yet — add one from the
                palette on the left.
            </p>
        );
    }

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
        >
            <SortableContext
                items={fields.map((f) => f._uid)}
                strategy={verticalListSortingStrategy}
            >
                <div className="space-y-2">
                    {fields.map((field) => (
                        <SortableFieldRow
                            key={field._uid}
                            field={field}
                            onChange={(patch) => updateField(field._uid, patch)}
                            onRemove={() => removeField(field._uid)}
                        />
                    ))}
                </div>
            </SortableContext>
        </DndContext>
    );
}

function SortableFieldRow({
    field,
    onChange,
    onRemove,
}: {
    field: DraftField;
    onChange: (patch: Partial<DraftField>) => void;
    onRemove: () => void;
}) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: field._uid });
    const [expanded, setExpanded] = useState(false);

    const style = { transform: CSS.Transform.toString(transform), transition };
    const isReserved = RESERVED_FIELD_KEYS.includes(field.key);
    // A description block has no answer, so key / required / error message
    // are meaningless for it — the editor collapses to heading + body text.
    const isDisplayOnly = !isInputField(field);
    const typeLabel =
        REGISTRATION_FIELD_TYPES.find((t) => t.value === field.type)?.label ??
        field.type;

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={cn(
                'rounded-md border bg-muted/30',
                isDragging && 'opacity-60 shadow-lg',
            )}
        >
            <div className="flex items-center gap-2 p-2.5">
                <button
                    type="button"
                    {...attributes}
                    {...listeners}
                    className="cursor-grab touch-none text-muted-foreground hover:text-foreground active:cursor-grabbing"
                    aria-label="Drag to reorder"
                >
                    <GripVertical className="h-4 w-4" />
                </button>

                <button
                    type="button"
                    className="flex flex-1 items-center gap-2 text-left"
                    onClick={() => setExpanded((v) => !v)}
                >
                    <span className="text-sm font-medium">
                        {field.label || 'Untitled field'}
                    </span>
                    <Badge variant="outline" className="text-[10px]">
                        {typeLabel}
                    </Badge>
                    {field.required && (
                        <Badge variant="secondary" className="text-[10px]">
                            Required
                        </Badge>
                    )}
                    {OPTION_FIELD_TYPES.includes(field.type) && (
                        <span className="text-[10px] text-muted-foreground">
                            {(field.options ?? []).length} options
                        </span>
                    )}
                </button>

                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => setExpanded((v) => !v)}
                    aria-label={expanded ? 'Collapse' : 'Expand'}
                >
                    {expanded ? (
                        <ChevronUp className="h-4 w-4" />
                    ) : (
                        <ChevronDown className="h-4 w-4" />
                    )}
                </Button>

                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground hover:text-destructive"
                    onClick={onRemove}
                    aria-label="Remove field"
                >
                    <Trash2 className="h-4 w-4" />
                </Button>
            </div>

            {expanded && (
                <FieldGroup className="border-t px-3 py-3">
                    <div className="grid grid-cols-2 gap-2">
                        <Field>
                            <FieldLabel>
                                {isDisplayOnly ? 'Heading' : 'Label'}
                            </FieldLabel>
                            <Input
                                value={field.label}
                                onChange={(e) =>
                                    onChange({ label: e.target.value })
                                }
                                placeholder={
                                    isDisplayOnly
                                        ? 'e.g. Before you continue'
                                        : 'e.g. Shirt Size'
                                }
                            />
                        </Field>
                        {!isDisplayOnly && (
                            <Field>
                                <FieldLabel>
                                    Key{' '}
                                    {isReserved && (
                                        <span className="font-normal text-muted-foreground">
                                            (built-in)
                                        </span>
                                    )}
                                </FieldLabel>
                                <Input
                                    value={field.key}
                                    disabled={isReserved}
                                    onChange={(e) =>
                                        onChange({
                                            key: e.target.value
                                                .toLowerCase()
                                                .replace(/[^a-z0-9_]/g, '_'),
                                        })
                                    }
                                    placeholder="key, e.g. shirt_size"
                                />
                            </Field>
                        )}
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                        <Field>
                            <FieldLabel>Type</FieldLabel>
                            <Select
                                value={field.type}
                                onValueChange={(value) => {
                                    const type = value as DraftField['type'];

                                    onChange(
                                        isInputField({ type })
                                            ? { type }
                                            : { type, required: false },
                                    );
                                }}
                            >
                                <SelectTrigger className="w-full">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {REGISTRATION_FIELD_TYPES.map((t) => (
                                        <SelectItem
                                            key={t.value}
                                            value={t.value}
                                        >
                                            {t.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </Field>
                        {!isDisplayOnly && (
                            <Field
                                orientation="horizontal"
                                className="items-center pt-6"
                            >
                                <Checkbox
                                    checked={field.required}
                                    onCheckedChange={(checked) =>
                                        onChange({
                                            required: Boolean(checked),
                                        })
                                    }
                                />
                                <FieldLabel className="font-normal">
                                    Required
                                </FieldLabel>
                            </Field>
                        )}
                    </div>

                    {OPTION_FIELD_TYPES.includes(field.type) && (
                        <OptionEditor
                            options={field.options ?? []}
                            onChange={(options) => onChange({ options })}
                        />
                    )}

                    {field.type === 'number' && (
                        <div className="grid grid-cols-2 gap-2">
                            <Field>
                                <FieldLabel>Min</FieldLabel>
                                <Input
                                    type="number"
                                    value={field.min ?? ''}
                                    onChange={(e) =>
                                        onChange({
                                            min:
                                                e.target.value === ''
                                                    ? null
                                                    : Number(e.target.value),
                                        })
                                    }
                                />
                            </Field>
                            <Field>
                                <FieldLabel>Max</FieldLabel>
                                <Input
                                    type="number"
                                    value={field.max ?? ''}
                                    onChange={(e) =>
                                        onChange({
                                            max:
                                                e.target.value === ''
                                                    ? null
                                                    : Number(e.target.value),
                                        })
                                    }
                                />
                            </Field>
                        </div>
                    )}

                    {field.type === 'rating' && (
                        <Field>
                            <FieldLabel>Max rating</FieldLabel>
                            <Input
                                type="number"
                                min={1}
                                max={10}
                                value={field.max_rating ?? 5}
                                onChange={(e) =>
                                    onChange({
                                        max_rating: Number(e.target.value) || 5,
                                    })
                                }
                                className="w-24"
                            />
                        </Field>
                    )}

                    {isDisplayOnly ? (
                        <Field>
                            <FieldLabel>Text</FieldLabel>
                            <Textarea
                                value={field.help_text ?? ''}
                                onChange={(e) =>
                                    onChange({ help_text: e.target.value })
                                }
                                placeholder="Instructions, notes or context shown to the participant. Nothing to fill in."
                                className="min-h-24"
                            />
                        </Field>
                    ) : (
                        <>
                            <Field>
                                <FieldLabel>Help text</FieldLabel>
                                <Input
                                    value={field.help_text ?? ''}
                                    onChange={(e) =>
                                        onChange({ help_text: e.target.value })
                                    }
                                    placeholder="Optional hint shown under the field"
                                />
                            </Field>

                            <Field>
                                <FieldLabel>Custom error message</FieldLabel>
                                <Textarea
                                    value={field.error_message ?? ''}
                                    onChange={(e) =>
                                        onChange({
                                            error_message: e.target.value,
                                        })
                                    }
                                    placeholder="Shown instead of the default message when this field fails validation"
                                    className="min-h-16"
                                />
                            </Field>
                        </>
                    )}
                </FieldGroup>
            )}
        </div>
    );
}
