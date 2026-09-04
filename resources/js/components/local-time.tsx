import { formatDateTime } from '@/lib/format-date';

/**
 * A timestamp shown in the viewer's own timezone.
 *
 * The server cannot know that timezone, so this is the one date on a page whose
 * text legitimately differs between the SSR pass and the browser.
 * suppressHydrationWarning marks it as such — every other date is pinned and
 * still has to match exactly.
 */
export function LocalTime({
    value,
    className,
}: {
    value?: string | null;
    className?: string;
}) {
    return (
        <time
            dateTime={value ?? undefined}
            className={className}
            suppressHydrationWarning
        >
            {formatDateTime(value)}
        </time>
    );
}
