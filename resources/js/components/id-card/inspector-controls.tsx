import { Input } from '@/components/ui/input';
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
