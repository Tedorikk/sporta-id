import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { EventFilters } from '@/types/event';

interface Props {
    filters: EventFilters;
    onRemove: (partial: Partial<EventFilters>) => void;
    onClearAll: () => void;
}

const FACET_LABELS: Record<keyof EventFilters, string> = {
    search: 'Search',
    category: 'Category',
    lifecycle: 'Publication',
    timing: 'Timing',
};

/**
 * Every applied filter gets a chip that names its facet and can be removed on its
 * own. Without them the only recovery from a surprising result set is clearing
 * everything and starting again.
 */
export function EventFilterChips({ filters, onRemove, onClearAll }: Props) {
    const applied = (
        Object.entries(filters) as [keyof EventFilters, string | null][]
    ).filter(([, value]) => !!value);

    if (applied.length === 0) {
        return null;
    }

    return (
        <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-muted-foreground">Filtered by</span>

            {applied.map(([facet, value]) => (
                <button
                    key={facet}
                    type="button"
                    onClick={() => onRemove({ [facet]: null })}
                    className="inline-flex items-center gap-1.5 rounded-full border bg-card py-1 pr-1.5 pl-2.5 text-xs transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                >
                    <span className="text-muted-foreground">
                        {FACET_LABELS[facet]}:
                    </span>
                    <span className="font-medium capitalize">{value}</span>
                    <X className="size-3.5 text-muted-foreground" />
                    <span className="sr-only">
                        Remove {FACET_LABELS[facet]} filter
                    </span>
                </button>
            ))}

            {applied.length > 1 && (
                <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs"
                    onClick={onClearAll}
                >
                    Clear all
                </Button>
            )}
        </div>
    );
}
