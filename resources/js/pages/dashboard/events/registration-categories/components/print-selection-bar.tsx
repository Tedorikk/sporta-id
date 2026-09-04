import { Printer, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
    count: number;
    printUrl: string;
    onClear: () => void;
}

/**
 * Sits above the registrations table once anything is ticked, rather than
 * putting a print control on every row — the same shape as the events index's
 * bulk toolbar, so selecting one registrant and selecting twenty cost the
 * same click.
 */
export function PrintSelectionBar({ count, printUrl, onClear }: Props) {
    const label = `${count} ${count === 1 ? 'card' : 'cards'}`;

    return (
        <div
            role="region"
            aria-label="Print selection"
            className="flex flex-wrap items-center gap-2 rounded-xl border border-primary/40 bg-accent px-3 py-2"
        >
            <span className="text-sm font-medium">{label} selected</span>

            <div className="ml-auto flex flex-wrap items-center gap-2">
                <Button size="sm" asChild>
                    <a href={printUrl} target="_blank" rel="noreferrer">
                        <Printer className="mr-2 size-4" />
                        Print ID cards ({count})
                    </a>
                </Button>

                <Button variant="ghost" size="sm" onClick={onClear}>
                    <X className="mr-2 size-4" />
                    Clear
                </Button>
            </div>
        </div>
    );
}
