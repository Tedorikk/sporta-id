import { useId } from 'react';
import { COLOR_SWATCHES } from '@/components/id-card/card-presets';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

export function InspectorSection({ title, children, className }: { title: string; children: React.ReactNode; className?: string }) {
    return (
        <section className={cn('border-b px-4 py-3.5 last:border-b-0', className)}>
            <h3 className="mb-2.5 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">{title}</h3>
            <div className="flex flex-col gap-2.5">{children}</div>
        </section>
    );
}

export function ControlRow({ label, children, htmlFor }: { label: string; children: React.ReactNode; htmlFor?: string }) {
    return (
        <div className="grid grid-cols-[76px_1fr] items-center gap-2">
            <label htmlFor={htmlFor} className="truncate text-xs text-muted-foreground">
                {label}
            </label>
            {children}
        </div>
    );
}

interface NumberControlProps {
    value: number;
    onChange: (value: number) => void;
    min?: number;
    max?: number;
    step?: number;
    suffix?: string;
    id?: string;
}

export function NumberControl({ value, onChange, min, max, step = 1, suffix, id }: NumberControlProps) {
    return (
        <div className="relative">
            <Input
                id={id}
                type="number"
                value={Number.isFinite(value) ? value : 0}
                min={min}
                max={max}
                step={step}
                onChange={(e) => {
                    const next = Number(e.target.value);

                    if (Number.isFinite(next)) {
                        onChange(min !== undefined ? Math.max(min, next) : next);
                    }
                }}
                className={cn('h-8 text-xs tabular-nums', suffix && 'pr-8')}
            />
            {suffix && (
                <span className="pointer-events-none absolute inset-y-0 right-2.5 flex items-center text-[10px] text-muted-foreground">
                    {suffix}
                </span>
            )}
        </div>
    );
}

interface ColorControlProps {
    value: string;
    onChange: (value: string) => void;
    /** Renders a "none" swatch that clears the value. */
    allowClear?: boolean;
}

export function ColorControl({ value, onChange, allowClear }: ColorControlProps) {
    const inputId = useId();
    const normalized = /^#[0-9a-f]{6}$/i.test(value) ? value : '#ffffff';

    return (
        <div className="flex items-center gap-1.5">
            <Popover>
                <PopoverTrigger asChild>
                    <button
                        type="button"
                        aria-label="Pick colour"
                        className="h-8 w-8 shrink-0 rounded-md border shadow-sm transition-shadow hover:ring-2 hover:ring-ring/40"
                        style={{
                            background: value
                                ? value
                                : 'repeating-conic-gradient(#cbd5e1 0% 25%, #ffffff 0% 50%) 50% / 8px 8px',
                        }}
                    />
                </PopoverTrigger>
                <PopoverContent className="w-56 p-3" align="start">
                    <div className="grid grid-cols-8 gap-1.5">
                        {COLOR_SWATCHES.map((swatch) => (
                            <button
                                key={swatch}
                                type="button"
                                aria-label={swatch}
                                onClick={() => onChange(swatch)}
                                className={cn(
                                    'h-5 w-5 rounded border transition-transform hover:scale-110',
                                    value?.toLowerCase() === swatch && 'ring-2 ring-ring ring-offset-1',
                                )}
                                style={{ background: swatch }}
                            />
                        ))}
                        {allowClear && (
                            <button
                                type="button"
                                aria-label="No fill"
                                onClick={() => onChange('')}
                                className="h-5 w-5 rounded border"
                                style={{ background: 'repeating-conic-gradient(#cbd5e1 0% 25%, #ffffff 0% 50%) 50% / 6px 6px' }}
                            />
                        )}
                    </div>
                    <label htmlFor={inputId} className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                        Custom
                        <input
                            id={inputId}
                            type="color"
                            value={normalized}
                            onChange={(e) => onChange(e.target.value)}
                            className="h-7 w-full cursor-pointer rounded border bg-transparent"
                        />
                    </label>
                </PopoverContent>
            </Popover>

            <Input
                value={value ?? ''}
                placeholder="none"
                onChange={(e) => onChange(e.target.value)}
                className="h-8 font-mono text-xs uppercase"
            />
        </div>
    );
}
