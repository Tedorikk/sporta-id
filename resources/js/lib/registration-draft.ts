/**
 * The half-filled registration form, kept in localStorage so a refresh, a
 * phone call or the browser reclaiming the tab doesn't cost a club manager
 * forty minutes of typing. Uploads are already URLs by the time they are in
 * the form, so they survive too.
 *
 * Storage can be missing or throw (private mode, cleared site data), so every
 * call is best-effort and the form must work identically without it.
 */
export interface RegistrationDraft<T = Record<string, unknown>> {
    values: T;
    pageIndex: number;
    /** ISO timestamp of the last save, shown when the draft is restored. */
    savedAt: string;
}

export function draftKey(registrationCategoryId: number): string {
    return `reg-draft:${registrationCategoryId}`;
}

export function readDraft<T>(key: string): RegistrationDraft<T> | null {
    try {
        const raw = window.localStorage.getItem(key);

        if (!raw) {
            return null;
        }

        const parsed = JSON.parse(raw) as Partial<RegistrationDraft<T>>;

        if (
            !parsed ||
            typeof parsed !== 'object' ||
            typeof parsed.values !== 'object' ||
            parsed.values === null ||
            typeof parsed.savedAt !== 'string'
        ) {
            return null;
        }

        return {
            values: parsed.values,
            pageIndex:
                typeof parsed.pageIndex === 'number' ? parsed.pageIndex : 0,
            savedAt: parsed.savedAt,
        };
    } catch {
        return null;
    }
}

export function writeDraft<T>(key: string, draft: RegistrationDraft<T>): void {
    try {
        window.localStorage.setItem(key, JSON.stringify(draft));
    } catch {
        // Quota exceeded or storage disabled — the form still works, it just
        // won't be remembered.
    }
}

export function clearDraft(key: string): void {
    try {
        window.localStorage.removeItem(key);
    } catch {
        // Nothing to clear, or storage disabled.
    }
}

/**
 * Whether the visitor has actually entered anything. Compared field by field
 * (as JSON) rather than on the whole object so key order — which differs
 * between a fresh default set and values RHF has merged — doesn't matter.
 */
export function sameAsDefaults(
    values: Record<string, unknown>,
    defaults: Record<string, unknown>,
): boolean {
    const keys = new Set([...Object.keys(values), ...Object.keys(defaults)]);

    for (const key of keys) {
        if (JSON.stringify(values[key]) !== JSON.stringify(defaults[key])) {
            return false;
        }
    }

    return true;
}
