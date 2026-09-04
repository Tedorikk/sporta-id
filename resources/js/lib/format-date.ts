/**
 * Every date is formatted with an explicit locale.
 *
 * Leaving it to the runtime made the SSR pass (Node resolves en-ID) and the
 * browser (en-US) produce different strings for the same date — "05/09/2026"
 * against "9/5/2026" — which failed hydration on every page showing a date.
 */
export const APP_LOCALE = 'id-ID';

/**
 * Calendar dates (start_date, end_date) are stored as plain Y-m-d and parse as
 * UTC midnight, so they are formatted in UTC: the date shown is the date stored,
 * for a viewer in Jakarta or anywhere else.
 */
const CALENDAR_DATE: Intl.DateTimeFormatOptions = {
    timeZone: 'UTC',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
};

export function formatDate(date?: string | null) {
    if (!date) {
        return 'N/A';
    }

    return new Date(date).toLocaleDateString(APP_LOCALE, CALENDAR_DATE);
}

/**
 * A wall-clock time is deliberately the viewer's own, so this cannot match what
 * the server rendered. Render it through <LocalTime> rather than inlining the
 * string, so React is told that this one text node is expected to differ.
 */
export function formatDateTime(date?: string | null) {
    if (!date) {
        return 'N/A';
    }

    return new Date(date).toLocaleString(APP_LOCALE, {
        dateStyle: 'medium',
        timeStyle: 'short',
    });
}
