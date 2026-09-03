import {
    AlignCenter,
    AlignHorizontalJustifyCenter,
    AlignLeft,
    AlignRight,
    AlignVerticalJustifyCenter,
    ArrowDownToLine,
    ArrowLeftToLine,
    ArrowRightToLine,
    ArrowUpToLine,
    Copy,
    Trash2,
} from 'lucide-react';
import {
    CANVAS_PRESETS,
    FONT_FAMILIES,
    FONT_WEIGHTS,
    matchPreset,
} from '@/components/id-card/card-presets';
import { ColorPickerControl } from '@/components/id-card/color-picker';
import { safeStyle } from '@/components/id-card/id-card-renderer';
import {
    ControlRow,
    InspectorSection,
    NumberControl,
} from '@/components/id-card/inspector-controls';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { UploadImage } from '@/components/upload-image';
import type {
    BindableField,
    CardCanvas,
    CardElement,
    CardElementStyle,
    CardSubjectType,
} from '@/types/card-template';
import { bindableFieldsFor } from '@/types/card-template';

const STATIC = '__static__';

type Align = 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom';

const ALIGN_ACTIONS: { key: Align; label: string; icon: typeof AlignLeft }[] = [
    { key: 'left', label: 'Align left', icon: ArrowLeftToLine },
    {
        key: 'center',
        label: 'Centre horizontally',
        icon: AlignHorizontalJustifyCenter,
    },
    { key: 'right', label: 'Align right', icon: ArrowRightToLine },
    { key: 'top', label: 'Align top', icon: ArrowUpToLine },
    {
        key: 'middle',
        label: 'Centre vertically',
        icon: AlignVerticalJustifyCenter,
    },
    { key: 'bottom', label: 'Align bottom', icon: ArrowDownToLine },
];

interface InspectorPanelProps {
    canvas: CardCanvas;
    subjectType: CardSubjectType;
    /** Extra bindable fields on top of the fixed set — e.g. a registration category's custom form fields. */
    customFields?: BindableField[];
    selected: CardElement | null;
    selectionCount: number;
    onCanvasChange: (patch: Partial<CardCanvas>) => void;
    onCanvasResize: (width: number, height: number) => void;
    onElementChange: (id: string, patch: Partial<CardElement>) => void;
    onStyleChange: (id: string, patch: Partial<CardElementStyle>) => void;
    onAlign: (align: Align) => void;
    onDuplicate: () => void;
    onDelete: () => void;
}

export function InspectorPanel({
    canvas,
    subjectType,
    customFields = [],
    selected,
    selectionCount,
    onCanvasChange,
    onCanvasResize,
    onElementChange,
    onStyleChange,
    onAlign,
    onDuplicate,
    onDelete,
}: InspectorPanelProps) {
    if (!selected) {
        return (
            <div className="flex h-full flex-col">
                {selectionCount > 1 && (
                    <InspectorSection
                        title={`${selectionCount} layers selected`}
                    >
                        <AlignButtons onAlign={onAlign} />
                        <div className="flex gap-2 pt-1">
                            <Button
                                variant="outline"
                                size="sm"
                                className="flex-1"
                                onClick={onDuplicate}
                            >
                                <Copy className="h-3.5 w-3.5" /> Duplicate
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                className="flex-1 text-destructive"
                                onClick={onDelete}
                            >
                                <Trash2 className="h-3.5 w-3.5" /> Delete
                            </Button>
                        </div>
                    </InspectorSection>
                )}

                <CanvasSection
                    canvas={canvas}
                    onCanvasChange={onCanvasChange}
                    onCanvasResize={onCanvasResize}
                />

                {selectionCount === 0 && (
                    <p className="px-4 py-6 text-center text-xs leading-relaxed text-muted-foreground">
                        Select a layer on the canvas to edit its content,
                        position and styling.
                    </p>
                )}
            </div>
        );
    }

    const style = safeStyle(selected);
    const fields = bindableFieldsFor(subjectType, selected.kind, customFields);
    const isText = selected.kind === 'text';
    const isMedia = selected.kind === 'image' || selected.kind === 'qr';

    return (
        <div className="flex h-full flex-col">
            <InspectorSection title="Content">
                <ControlRow label="Layer name">
                    <Input
                        value={selected.name ?? ''}
                        placeholder="Auto"
                        onChange={(e) =>
                            onElementChange(selected.id, {
                                name: e.target.value || undefined,
                            })
                        }
                        className="h-8 text-xs"
                    />
                </ControlRow>

                <ControlRow label="Data field">
                    <Select
                        value={selected.binding ?? STATIC}
                        onValueChange={(value) =>
                            onElementChange(selected.id, {
                                binding: value === STATIC ? null : value,
                            })
                        }
                    >
                        <SelectTrigger className="h-8 text-xs">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value={STATIC}>
                                Static content
                            </SelectItem>
                            {fields.map((field) => (
                                <SelectItem
                                    key={field.value}
                                    value={field.value}
                                >
                                    {field.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </ControlRow>

                {!selected.binding && isText && (
                    <Textarea
                        value={selected.staticText ?? ''}
                        onChange={(e) =>
                            onElementChange(selected.id, {
                                staticText: e.target.value,
                            })
                        }
                        rows={2}
                        placeholder="Type the text shown on every card…"
                        className="text-xs"
                    />
                )}

                {!selected.binding && isMedia && (
                    <div className="flex flex-col gap-2">
                        {/* No enableCrop/ratio: uploads keep their native aspect ratio —
                            the element's own Fit setting (cover/contain) handles framing,
                            since the box on canvas rarely matches the source image. */}
                        <UploadImage
                            value={selected.staticImageUrl ?? null}
                            onChange={(url) =>
                                onElementChange(selected.id, {
                                    staticImageUrl: url ?? undefined,
                                })
                            }
                            height={120}
                            placeholder="Upload or drop an image"
                        />
                        <Input
                            value={selected.staticImageUrl ?? ''}
                            onChange={(e) =>
                                onElementChange(selected.id, {
                                    staticImageUrl: e.target.value,
                                })
                            }
                            placeholder="…or paste an image URL"
                            className="h-8 text-xs"
                        />
                    </div>
                )}

                {selected.binding && (
                    <p className="text-[11px] leading-relaxed text-muted-foreground">
                        Filled per card from the{' '}
                        <span className="font-medium text-foreground">
                            {selected.binding}
                        </span>{' '}
                        field.
                    </p>
                )}
            </InspectorSection>

            <InspectorSection title="Position & size">
                <div className="grid grid-cols-2 gap-2">
                    <LabeledNumber
                        label="X"
                        value={selected.x}
                        onChange={(x) => onElementChange(selected.id, { x })}
                    />
                    <LabeledNumber
                        label="Y"
                        value={selected.y}
                        onChange={(y) => onElementChange(selected.id, { y })}
                    />
                    <LabeledNumber
                        label="W"
                        value={selected.width}
                        min={1}
                        onChange={(width) =>
                            onElementChange(selected.id, { width })
                        }
                    />
                    <LabeledNumber
                        label="H"
                        value={selected.height}
                        min={1}
                        onChange={(height) =>
                            onElementChange(selected.id, { height })
                        }
                    />
                </div>

                <ControlRow label="Rotation">
                    <NumberControl
                        value={selected.rotation ?? 0}
                        step={1}
                        suffix="°"
                        onChange={(rotation) =>
                            onElementChange(selected.id, { rotation })
                        }
                    />
                </ControlRow>

                <AlignButtons onAlign={onAlign} />
            </InspectorSection>

            {isText && (
                <InspectorSection title="Typography">
                    <ControlRow label="Font">
                        <Select
                            value={style.fontFamily ?? FONT_FAMILIES[0].value}
                            onValueChange={(fontFamily) =>
                                onStyleChange(selected.id, { fontFamily })
                            }
                        >
                            <SelectTrigger className="h-8 text-xs">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {FONT_FAMILIES.map((font) => (
                                    <SelectItem
                                        key={font.value}
                                        value={font.value}
                                        style={{ fontFamily: font.value }}
                                    >
                                        {font.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </ControlRow>

                    <div className="grid grid-cols-2 gap-2">
                        <LabeledNumber
                            label="Size"
                            value={style.fontSize ?? 14}
                            min={4}
                            onChange={(fontSize) =>
                                onStyleChange(selected.id, { fontSize })
                            }
                        />
                        <div className="grid grid-cols-[28px_1fr] items-center gap-1.5">
                            <span className="text-center text-[11px] text-muted-foreground">
                                Wt
                            </span>
                            <Select
                                value={String(style.fontWeight ?? 400)}
                                onValueChange={(value) =>
                                    onStyleChange(selected.id, {
                                        fontWeight: Number(value),
                                    })
                                }
                            >
                                <SelectTrigger className="h-8 text-xs">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {FONT_WEIGHTS.map((weight) => (
                                        <SelectItem
                                            key={weight.value}
                                            value={String(weight.value)}
                                        >
                                            {weight.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                        <LabeledNumber
                            label="Track"
                            value={style.letterSpacing ?? 0}
                            step={0.5}
                            onChange={(letterSpacing) =>
                                onStyleChange(selected.id, { letterSpacing })
                            }
                        />
                        <LabeledNumber
                            label="Leading"
                            value={style.lineHeight ?? 1.2}
                            step={0.1}
                            min={0.5}
                            onChange={(lineHeight) =>
                                onStyleChange(selected.id, { lineHeight })
                            }
                        />
                    </div>

                    <ControlRow label="Align">
                        <div className="flex gap-1">
                            {(['left', 'center', 'right'] as const).map(
                                (value) => {
                                    const Icon =
                                        value === 'left'
                                            ? AlignLeft
                                            : value === 'center'
                                              ? AlignCenter
                                              : AlignRight;
                                    const isActive =
                                        (style.textAlign ?? 'left') === value;

                                    return (
                                        <Button
                                            key={value}
                                            type="button"
                                            variant={
                                                isActive ? 'secondary' : 'ghost'
                                            }
                                            size="icon"
                                            aria-label={`Text align ${value}`}
                                            aria-pressed={isActive}
                                            className="h-8 w-8"
                                            onClick={() =>
                                                onStyleChange(selected.id, {
                                                    textAlign: value,
                                                })
                                            }
                                        >
                                            <Icon className="h-3.5 w-3.5" />
                                        </Button>
                                    );
                                },
                            )}
                        </div>
                    </ControlRow>

                    <ControlRow label="Vertical">
                        <Select
                            value={style.verticalAlign ?? 'middle'}
                            onValueChange={(value) =>
                                onStyleChange(selected.id, {
                                    verticalAlign: value as
                                        'top' | 'middle' | 'bottom',
                                })
                            }
                        >
                            <SelectTrigger className="h-8 text-xs">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="top">Top</SelectItem>
                                <SelectItem value="middle">Middle</SelectItem>
                                <SelectItem value="bottom">Bottom</SelectItem>
                            </SelectContent>
                        </Select>
                    </ControlRow>

                    <ControlRow label="Case">
                        <Select
                            value={style.textTransform ?? 'none'}
                            onValueChange={(value) =>
                                onStyleChange(selected.id, {
                                    textTransform: value as
                                        'none' | 'uppercase' | 'capitalize',
                                })
                            }
                        >
                            <SelectTrigger className="h-8 text-xs">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="none">As typed</SelectItem>
                                <SelectItem value="uppercase">
                                    UPPERCASE
                                </SelectItem>
                                <SelectItem value="capitalize">
                                    Capitalise
                                </SelectItem>
                            </SelectContent>
                        </Select>
                    </ControlRow>

                    <ControlRow label="Colour">
                        <ColorPickerControl
                            allowGradient={false}
                            value={style.color ?? '#0f172a'}
                            onChange={(color) =>
                                onStyleChange(selected.id, { color })
                            }
                        />
                    </ControlRow>
                </InspectorSection>
            )}

            <InspectorSection title="Appearance">
                <ControlRow label={isText ? 'Highlight' : 'Fill'}>
                    <ColorPickerControl
                        allowClear
                        value={style.background ?? ''}
                        onChange={(background) =>
                            onStyleChange(selected.id, {
                                background: background || undefined,
                            })
                        }
                    />
                </ControlRow>

                {isMedia && (
                    <ControlRow label="Fit">
                        <Select
                            value={style.objectFit ?? 'cover'}
                            onValueChange={(value) =>
                                onStyleChange(selected.id, {
                                    objectFit: value as 'cover' | 'contain',
                                })
                            }
                        >
                            <SelectTrigger className="h-8 text-xs">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="cover">
                                    Cover (crop to fill)
                                </SelectItem>
                                <SelectItem value="contain">
                                    Contain (fit inside)
                                </SelectItem>
                            </SelectContent>
                        </Select>
                    </ControlRow>
                )}

                <ControlRow label="Radius">
                    <NumberControl
                        value={style.borderRadius ?? 0}
                        min={0}
                        suffix="px"
                        onChange={(borderRadius) =>
                            onStyleChange(selected.id, { borderRadius })
                        }
                    />
                </ControlRow>

                <div className="grid grid-cols-2 gap-2">
                    <LabeledNumber
                        label="Border"
                        value={style.borderWidth ?? 0}
                        min={0}
                        onChange={(borderWidth) =>
                            onStyleChange(selected.id, { borderWidth })
                        }
                    />
                    <LabeledNumber
                        label="Opacity"
                        value={Math.round((style.opacity ?? 1) * 100)}
                        min={0}
                        max={100}
                        onChange={(value) =>
                            onStyleChange(selected.id, {
                                opacity:
                                    Math.min(100, Math.max(0, value)) / 100,
                            })
                        }
                    />
                </div>

                {(style.borderWidth ?? 0) > 0 && (
                    <ControlRow label="Border colour">
                        <ColorPickerControl
                            allowGradient={false}
                            value={style.borderColor ?? '#0f172a'}
                            onChange={(borderColor) =>
                                onStyleChange(selected.id, { borderColor })
                            }
                        />
                    </ControlRow>
                )}
            </InspectorSection>

            <InspectorSection title="Layer">
                <div className="flex gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={onDuplicate}
                    >
                        <Copy className="h-3.5 w-3.5" /> Duplicate
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 text-destructive hover:text-destructive"
                        onClick={onDelete}
                    >
                        <Trash2 className="h-3.5 w-3.5" /> Delete
                    </Button>
                </div>
            </InspectorSection>

            <CanvasSection
                canvas={canvas}
                onCanvasChange={onCanvasChange}
                onCanvasResize={onCanvasResize}
            />
        </div>
    );
}

function CanvasSection({
    canvas,
    onCanvasChange,
    onCanvasResize,
}: {
    canvas: CardCanvas;
    onCanvasChange: (patch: Partial<CardCanvas>) => void;
    onCanvasResize: (width: number, height: number) => void;
}) {
    const preset = matchPreset(canvas);

    return (
        <InspectorSection title="Card">
            <ControlRow label="Size">
                <Select
                    value={preset?.key ?? 'custom'}
                    onValueChange={(key) => {
                        const next = CANVAS_PRESETS.find((p) => p.key === key);

                        if (next) {
                            onCanvasResize(next.width, next.height);
                        }
                    }}
                >
                    <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Custom" />
                    </SelectTrigger>
                    <SelectContent>
                        {!preset && (
                            <SelectItem value="custom">Custom</SelectItem>
                        )}
                        {CANVAS_PRESETS.map((option) => (
                            <SelectItem key={option.key} value={option.key}>
                                {option.label} · {option.hint}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </ControlRow>

            <div className="grid grid-cols-2 gap-2">
                <LabeledNumber
                    label="W"
                    value={canvas.width}
                    min={80}
                    onChange={(width) => onCanvasResize(width, canvas.height)}
                />
                <LabeledNumber
                    label="H"
                    value={canvas.height}
                    min={80}
                    onChange={(height) => onCanvasResize(canvas.width, height)}
                />
            </div>

            <ControlRow label="Background">
                <ColorPickerControl
                    value={canvas.background || '#ffffff'}
                    onChange={(background) => onCanvasChange({ background })}
                />
            </ControlRow>
        </InspectorSection>
    );
}

function AlignButtons({ onAlign }: { onAlign: (align: Align) => void }) {
    return (
        <div className="flex gap-1">
            {ALIGN_ACTIONS.map(({ key, label, icon: Icon }) => (
                <Tooltip key={key}>
                    <TooltipTrigger asChild>
                        <Button
                            variant="ghost"
                            size="icon"
                            aria-label={label}
                            className="h-8 w-8"
                            onClick={() => onAlign(key)}
                        >
                            <Icon className="h-3.5 w-3.5" />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>{label}</TooltipContent>
                </Tooltip>
            ))}
        </div>
    );
}

function LabeledNumber({
    label,
    value,
    onChange,
    min,
    max,
    step,
}: {
    label: string;
    value: number;
    onChange: (value: number) => void;
    min?: number;
    max?: number;
    step?: number;
}) {
    return (
        <div className="grid grid-cols-[28px_1fr] items-center gap-1.5">
            <span className="text-center text-[11px] text-muted-foreground">
                {label}
            </span>
            <NumberControl
                value={Math.round(value * 100) / 100}
                onChange={onChange}
                min={min}
                max={max}
                step={step}
            />
        </div>
    );
}
