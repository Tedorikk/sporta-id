import { Lock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';

/**
 * A field the public form renders on its own — the organizer can't edit,
 * move or remove it, but they should still see it in the builder so the
 * canvas matches what a participant actually gets. Its label may still be
 * relabeled (e.g. "Full Name" → "Player Name") via `labelValue`/`onLabelChange`.
 */
export function BuiltInFieldRow({
    label,
    typeLabel,
    note,
    labelValue,
    onLabelChange,
}: {
    label: string;
    typeLabel: string;
    note: string;
    labelValue?: string;
    onLabelChange?: (value: string) => void;
}) {
    return (
        <div className="rounded-md border border-dashed bg-muted/50">
            <div className="flex items-center gap-2 p-2.5">
                <Lock
                    className="h-4 w-4 shrink-0 text-muted-foreground"
                    aria-label="Built-in field"
                />
                <div className="flex min-w-0 flex-1 flex-col gap-1 sm:flex-row sm:items-center sm:gap-2">
                    {onLabelChange ? (
                        <Input
                            value={labelValue ?? ''}
                            onChange={(e) => onLabelChange(e.target.value)}
                            placeholder={label}
                            className="h-7 max-w-48 text-sm font-medium"
                            aria-label="Field label"
                        />
                    ) : (
                        <span className="text-sm font-medium">{label}</span>
                    )}
                    <div className="flex flex-wrap items-center gap-1.5">
                        <Badge variant="outline" className="text-[10px]">
                            {typeLabel}
                        </Badge>
                        <Badge variant="secondary" className="text-[10px]">
                            Required
                        </Badge>
                        <Badge variant="secondary" className="text-[10px]">
                            Built-in
                        </Badge>
                    </div>
                </div>
            </div>
            <p className="border-t px-3 py-2 text-xs text-muted-foreground">
                {note}
            </p>
        </div>
    );
}
