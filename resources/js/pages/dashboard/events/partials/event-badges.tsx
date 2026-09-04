import { Archive, CircleDot, Clock, Megaphone, PencilLine } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { EventStatus } from '@/types/event';

/**
 * Timing and publication are separate dimensions, so they get separate badges.
 * Each pairs its colour with an icon — colour alone is not an accessible signal.
 */
const TIMING_BADGE: Record<
    EventStatus,
    { label: string; className: string; icon: typeof Clock }
> = {
    upcoming: {
        label: 'Upcoming',
        className:
            'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
        icon: Clock,
    },
    ongoing: {
        label: 'Ongoing',
        className:
            'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
        icon: CircleDot,
    },
    past: {
        label: 'Past',
        className: 'bg-muted text-muted-foreground',
        icon: Archive,
    },
};

export function EventTimingBadge({ status }: { status: EventStatus }) {
    const { label, className, icon: Icon } = TIMING_BADGE[status];

    return (
        <Badge className={`gap-1 ${className}`}>
            <Icon className="size-3" />
            {label}
        </Badge>
    );
}

export function EventLifecycleBadge({ published }: { published: boolean }) {
    return published ? (
        <Badge variant="secondary" className="gap-1">
            <Megaphone className="size-3" />
            Published
        </Badge>
    ) : (
        <Badge variant="outline" className="gap-1 border-dashed">
            <PencilLine className="size-3" />
            Draft
        </Badge>
    );
}
