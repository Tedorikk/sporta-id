/**
 * Race times are durations, not clock times: a 10K is "48:12", a marathon
 * "3:41:07". Intl has no duration formatter these pages can rely on, so the
 * two shapes below are built by hand and used everywhere a time is shown.
 */
export function formatDuration(seconds?: number | null): string {
    if (seconds === null || seconds === undefined) {
        return '—';
    }

    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const padded = (value: number) => String(value).padStart(2, '0');

    return hours > 0
        ? `${hours}:${padded(minutes)}:${padded(secs)}`
        : `${minutes}:${padded(secs)}`;
}

/** "5:42 /km" — the number runners actually compare themselves on. */
export function formatPace(secondsPerKm?: number | null): string {
    if (!secondsPerKm) {
        return '—';
    }

    return `${formatDuration(Math.round(secondsPerKm))} /km`;
}

/** 21097 → "21.1 km"; whole kilometres lose the decimal. */
export function formatDistance(meters: number): string {
    const km = meters / 1000;

    return `${Number.isInteger(km) ? km : km.toFixed(1)} km`;
}

/**
 * Accepts what organizers actually type into a finish-time box — "48:12",
 * "3:41:07", "1:02:03.5" — and returns whole seconds, or null if it is not a
 * time at all. Mirrors the parsing the CSV importer does server-side.
 */
export function parseDuration(input: string): number | null {
    const trimmed = input.trim();

    if (!/^\d{1,2}(:\d{1,2}){1,2}(\.\d+)?$/.test(trimmed)) {
        return null;
    }

    const parts = trimmed.split(':').map(Number);
    const seconds = parts.reduce((total, part) => total * 60 + part, 0);

    return Math.floor(seconds);
}
