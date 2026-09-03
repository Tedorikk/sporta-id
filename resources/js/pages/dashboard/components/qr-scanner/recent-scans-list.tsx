import { cn } from '@/lib/utils';

export type ScanHistoryVariant = 'success' | 'warning' | 'danger';

export interface ScanHistoryEntry {
    id: string;
    time: Date;
    name: string;
    detail: string;
    variant: ScanHistoryVariant;
}

const DOT_CLASSNAMES: Record<ScanHistoryVariant, string> = {
    success: 'bg-emerald-500',
    warning: 'bg-amber-500',
    danger: 'bg-red-500',
};

function relativeTime(date: Date) {
    const seconds = Math.max(
        0,
        Math.round((Date.now() - date.getTime()) / 1000),
    );

    if (seconds < 5) {
        return 'just now';
    }

    if (seconds < 60) {
        return `${seconds}s ago`;
    }

    const minutes = Math.round(seconds / 60);

    if (minutes < 60) {
        return `${minutes}m ago`;
    }

    return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

/** A running log of the last several scans so staff can catch duplicates or a misread without re-scanning. */
export function RecentScansList({ entries }: { entries: ScanHistoryEntry[] }) {
    if (entries.length === 0) {
        return null;
    }

    return (
        <div className="rounded-xl border bg-card shadow-sm">
            <div className="border-b p-4">
                <span className="text-sm font-medium text-muted-foreground">
                    Recent Scans
                </span>
            </div>
            <ul className="divide-y">
                {entries.map((entry) => (
                    <li
                        key={entry.id}
                        className="flex items-center gap-3 px-4 py-2.5"
                    >
                        <span
                            className={cn(
                                'h-2 w-2 shrink-0 rounded-full',
                                DOT_CLASSNAMES[entry.variant],
                            )}
                        />
                        <span className="min-w-0 flex-1 truncate text-sm font-medium">
                            {entry.name}
                        </span>
                        <span className="shrink-0 truncate text-xs text-muted-foreground">
                            {entry.detail}
                        </span>
                        <span className="shrink-0 text-xs text-muted-foreground">
                            {relativeTime(entry.time)}
                        </span>
                    </li>
                ))}
            </ul>
        </div>
    );
}
