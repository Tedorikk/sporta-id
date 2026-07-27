import { useRef, useState } from 'react';
import { COLOR_SWATCHES } from '@/components/id-card/card-presets';
import type { HSVA } from '@/components/id-card/color-math';
import { hsvaToRgba, parseColor, rgbaToCss, rgbaToHex, rgbaToHsva } from '@/components/id-card/color-math';
import type { ColorValue, GradientType } from '@/components/id-card/gradient';
import { colorAtOffset, defaultGradient, parseColorValue, serializeColorValue } from '@/components/id-card/gradient';
import { GradientBar } from '@/components/id-card/gradient-bar';
import { usePointerDrag } from '@/components/id-card/use-pointer-drag';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

const MODES: { value: 'solid' | GradientType; label: string }[] = [
    { value: 'solid', label: 'Solid' },
    { value: 'linear', label: 'Linear' },
    { value: 'radial', label: 'Radial' },
];

function hsvaToCssBackground(h: number): string {
    return `hsl(${h}, 100%, 50%)`;
}

function SaturationValueField({ hsva, onChange }: { hsva: HSVA; onChange: (patch: Partial<HSVA>) => void }) {
    const ref = useRef<HTMLDivElement>(null);
    const { onPointerDown } = usePointerDrag(ref, (fx, fy) => onChange({ s: fx * 100, v: (1 - fy) * 100 }));

    return (
        <div
            ref={ref}
            onPointerDown={onPointerDown}
            className="relative h-36 w-full cursor-crosshair touch-none rounded-md"
            style={{ background: hsvaToCssBackground(hsva.h) }}
        >
            <div className="absolute inset-0 rounded-md" style={{ background: 'linear-gradient(to right, #fff, rgba(255,255,255,0))' }} />
            <div className="absolute inset-0 rounded-md" style={{ background: 'linear-gradient(to top, #000, rgba(0,0,0,0))' }} />
            <div
                className="absolute h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-[0_0_0_1px_rgba(0,0,0,0.4)]"
                style={{ left: `${hsva.s}%`, top: `${100 - hsva.v}%`, background: rgbaToHex(hsvaToRgba({ ...hsva, a: 1 })) }}
            />
        </div>
    );
}

function HueSlider({ hue, onChange }: { hue: number; onChange: (hue: number) => void }) {
    const ref = useRef<HTMLDivElement>(null);
    const { onPointerDown } = usePointerDrag(ref, (fx) => onChange(fx * 360));

    return (
        <div
            ref={ref}
            onPointerDown={onPointerDown}
            className="relative h-3 w-full cursor-pointer touch-none rounded-full"
            style={{ background: 'linear-gradient(to right, #f00, #ff0, #0f0, #0ff, #00f, #f0f, #f00)' }}
        >
            <div
                className="absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-white shadow-[0_0_0_1px_rgba(0,0,0,0.3)]"
                style={{ left: `${(hue / 360) * 100}%`, background: hsvaToCssBackground(hue) }}
            />
        </div>
    );
}

function AlphaSlider({ hsva, onChange }: { hsva: HSVA; onChange: (alpha: number) => void }) {
    const ref = useRef<HTMLDivElement>(null);
    const { onPointerDown } = usePointerDrag(ref, (fx) => onChange(fx));
    const opaque = rgbaToHex(hsvaToRgba({ ...hsva, a: 1 }));

    return (
        <div
            ref={ref}
            onPointerDown={onPointerDown}
            className="relative h-3 w-full cursor-pointer touch-none rounded-full"
            style={{
                backgroundImage: `linear-gradient(to right, transparent, ${opaque}), repeating-conic-gradient(#cbd5e1 0% 25%, #ffffff 0% 50%)`,
                backgroundSize: '100% 100%, 8px 8px',
            }}
        >
            <div
                className="absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-[0_0_0_1px_rgba(0,0,0,0.3)]"
                style={{ left: `${hsva.a * 100}%`, background: rgbaToCss(hsvaToRgba(hsva)) }}
            />
        </div>
    );
}

interface ColorPickerControlProps {
    value: string;
    onChange: (value: string) => void;
    /** Renders a "none" swatch that clears the value. */
    allowClear?: boolean;
    /** Hide the gradient tabs for contexts that only support a flat color (e.g. text color, border color). */
    allowGradient?: boolean;
}

export function ColorPickerControl({ value, onChange, allowClear, allowGradient = true }: ColorPickerControlProps) {
    const [open, setOpen] = useState(false);
    // Parsed fresh each time the popover opens, so external changes (undo, etc.) aren't clobbered.
    const [draft, setDraft] = useState<ColorValue>(() => parseColorValue(value));
    const [activeStopId, setActiveStopId] = useState<string>(() => (draft.mode !== 'solid' ? draft.stops[0]?.id : ''));
    const [hexInput, setHexInput] = useState('');

    function commit(next: ColorValue) {
        setDraft(next);
        onChange(serializeColorValue(next));
    }

    function syncOnOpen(next: boolean) {
        setOpen(next);

        if (next) {
            const parsed = parseColorValue(value);
            setDraft(parsed);
            setActiveStopId(parsed.mode !== 'solid' ? (parsed.stops[0]?.id ?? '') : '');
        }
    }

    const activeColorString =
        draft.mode === 'solid' ? draft.color : (draft.stops.find((s) => s.id === activeStopId)?.color ?? draft.stops[0]?.color ?? '#000000');

    const hsva = rgbaToHsva(parseColor(activeColorString) ?? { r: 0, g: 0, b: 0, a: 1 });

    function setActiveColor(nextColor: string) {
        if (draft.mode === 'solid') {
            commit({ mode: 'solid', color: nextColor });

            return;
        }

        commit({
            ...draft,
            stops: draft.stops.map((s) => (s.id === activeStopId ? { ...s, color: nextColor } : s)),
        });
    }

    function setHsva(patch: Partial<HSVA>) {
        const next = { ...hsva, ...patch };
        setActiveColor(rgbaToHex(hsvaToRgba(next)));
    }

    function switchMode(mode: 'solid' | GradientType) {
        if (mode === draft.mode) {
            return;
        }

        if (mode === 'solid') {
            commit({ mode: 'solid', color: activeColorString });

            return;
        }

        if (draft.mode === 'solid') {
            const gradient = defaultGradient(mode, draft.color);
            commit({ mode, ...gradient });
            setActiveStopId(gradient.stops[0].id);

            return;
        }

        commit({ ...draft, mode });
    }

    const previewCss = draft.mode === 'solid' ? draft.color : serializeColorValue(draft);

    return (
        <div className="flex items-center gap-1.5">
            <Popover open={open} onOpenChange={syncOnOpen}>
                <PopoverTrigger asChild>
                    <button
                        type="button"
                        aria-label="Open color picker"
                        className="h-8 w-8 shrink-0 rounded-md border shadow-sm transition-shadow hover:ring-2 hover:ring-ring/40"
                        style={{ background: previewCss || 'repeating-conic-gradient(#cbd5e1 0% 25%, #ffffff 0% 50%) 50% / 8px 8px' }}
                    />
                </PopoverTrigger>
                <PopoverContent className="w-64 space-y-3 p-3" align="start">
                    {allowGradient && (
                        <Tabs value={draft.mode} onValueChange={(v) => switchMode(v as 'solid' | GradientType)}>
                            <TabsList className="w-full">
                                {MODES.map((m) => (
                                    <TabsTrigger key={m.value} value={m.value} className="text-xs">
                                        {m.label}
                                    </TabsTrigger>
                                ))}
                            </TabsList>
                        </Tabs>
                    )}

                    {draft.mode !== 'solid' && (
                        <>
                            <GradientBar
                                stops={draft.stops}
                                activeStopId={activeStopId || draft.stops[0]?.id}
                                onSelect={setActiveStopId}
                                onMoveStop={(id, offset) => commit({ ...draft, stops: draft.stops.map((s) => (s.id === id ? { ...s, offset } : s)) })}
                                onAddStop={(offset) => {
                                    const color = colorAtOffset(draft.stops, offset);
                                    const id = `stop_${Date.now().toString(36)}`;

                                    commit({ ...draft, stops: [...draft.stops, { id, color, offset }] });
                                    setActiveStopId(id);
                                }}
                                onRemoveStop={(id) => {
                                    if (draft.stops.length <= 2) {
                                        return;
                                    }

                                    const remaining = draft.stops.filter((s) => s.id !== id);
                                    commit({ ...draft, stops: remaining });
                                    setActiveStopId(remaining[0].id);
                                }}
                            />

                            {draft.mode === 'linear' && (
                                <div className="flex items-center gap-2">
                                    <span className="text-xs text-muted-foreground">Angle</span>
                                    <input
                                        type="range"
                                        min={0}
                                        max={360}
                                        value={draft.angle}
                                        onChange={(e) => commit({ ...draft, angle: Number(e.target.value) })}
                                        className="h-1.5 flex-1 accent-primary"
                                    />
                                    <span className="w-9 text-right text-xs tabular-nums text-muted-foreground">{Math.round(draft.angle)}°</span>
                                </div>
                            )}
                        </>
                    )}

                    <SaturationValueField hsva={hsva} onChange={setHsva} />
                    <HueSlider hue={hsva.h} onChange={(h) => setHsva({ h })} />
                    <AlphaSlider hsva={hsva} onChange={(a) => setHsva({ a })} />

                    <div className="flex items-center gap-1.5">
                        <Input
                            value={hexInput || rgbaToCss(hsvaToRgba(hsva))}
                            onFocus={() => setHexInput(rgbaToCss(hsvaToRgba(hsva)))}
                            onChange={(e) => setHexInput(e.target.value)}
                            onBlur={() => {
                                const parsed = parseColor(hexInput);

                                if (parsed) {
                                    setActiveColor(rgbaToHex(parsed));
                                }

                                setHexInput('');
                            }}
                            onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
                            className="h-8 flex-1 font-mono text-xs"
                        />
                    </div>

                    <div className="grid grid-cols-8 gap-1.5 border-t pt-3">
                        {COLOR_SWATCHES.map((swatch) => (
                            <button
                                key={swatch}
                                type="button"
                                aria-label={swatch}
                                onClick={() => setActiveColor(swatch)}
                                className={cn(
                                    'h-5 w-5 rounded border transition-transform hover:scale-110',
                                    activeColorString.toLowerCase() === swatch && 'ring-2 ring-ring ring-offset-1',
                                )}
                                style={{ background: swatch }}
                            />
                        ))}
                        {allowClear && (
                            <button
                                type="button"
                                aria-label="No fill"
                                onClick={() => {
                                    setDraft({ mode: 'solid', color: '' });
                                    onChange('');
                                }}
                                className="h-5 w-5 rounded border"
                                style={{ background: 'repeating-conic-gradient(#cbd5e1 0% 25%, #ffffff 0% 50%) 50% / 6px 6px' }}
                            />
                        )}
                    </div>
                </PopoverContent>
            </Popover>

            <Input
                value={draft.mode === 'solid' ? (value ?? '') : `${draft.mode === 'linear' ? 'Linear' : 'Radial'} · ${draft.stops.length} stops`}
                readOnly={draft.mode !== 'solid'}
                placeholder="none"
                onChange={(e) => onChange(e.target.value)}
                className="h-8 font-mono text-xs uppercase"
            />
        </div>
    );
}
