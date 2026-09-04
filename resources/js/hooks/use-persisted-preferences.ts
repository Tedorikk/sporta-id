import { useCallback, useSyncExternalStore } from 'react';

/**
 * View preferences that belong to the person rather than the URL — density,
 * hidden columns — kept in this browser only.
 *
 * Backed by useSyncExternalStore so the server and the first client render both
 * use `defaults` and hydration stays clean; the stored value is applied on the
 * re-render straight after. Pass a module-level constant as `defaults`: it is
 * returned as the server snapshot and must keep a stable identity.
 */

const snapshots = new Map<string, unknown>();
const listeners = new Map<string, Set<() => void>>();

function readStored<T extends object>(key: string, defaults: T): T {
    try {
        const stored = window.localStorage.getItem(key);

        if (stored) {
            return { ...defaults, ...(JSON.parse(stored) as Partial<T>) };
        }
    } catch {
        // Private windows and blocked site data just mean the defaults stand.
    }

    return defaults;
}

function notify(key: string) {
    listeners.get(key)?.forEach((listener) => listener());
}

export function usePersistedPreferences<T extends object>(
    key: string,
    defaults: T,
) {
    const subscribe = useCallback(
        (onStoreChange: () => void) => {
            const forKey = listeners.get(key) ?? new Set();
            forKey.add(onStoreChange);
            listeners.set(key, forKey);

            return () => {
                forKey.delete(onStoreChange);
            };
        },
        [key],
    );

    const getSnapshot = useCallback((): T => {
        // Cached because useSyncExternalStore requires a stable reference between
        // reads — a fresh object every call would loop forever.
        if (!snapshots.has(key)) {
            snapshots.set(key, readStored(key, defaults));
        }

        return snapshots.get(key) as T;
    }, [key, defaults]);

    const getServerSnapshot = useCallback(() => defaults, [defaults]);

    const preferences = useSyncExternalStore(
        subscribe,
        getSnapshot,
        getServerSnapshot,
    );

    const update = useCallback(
        (partial: Partial<T>) => {
            const next = { ...(snapshots.get(key) as T), ...partial };
            snapshots.set(key, next);

            try {
                window.localStorage.setItem(key, JSON.stringify(next));
            } catch {
                // Applied for this session, just not remembered.
            }

            notify(key);
        },
        [key],
    );

    return [preferences, update] as const;
}
