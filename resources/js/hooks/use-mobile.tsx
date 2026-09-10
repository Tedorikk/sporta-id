import { useCallback, useSyncExternalStore } from 'react';

const MOBILE_BREAKPOINT = 768;

/**
 * One MediaQueryList per breakpoint, shared across every caller — creating a
 * fresh one per render would resubscribe on each pass.
 */
const queries = new Map<number, MediaQueryList>();

function queryFor(maxWidth: number): MediaQueryList | undefined {
    if (typeof window === 'undefined') {
        return undefined;
    }

    let query = queries.get(maxWidth);

    if (!query) {
        // 0.02 rather than 1: viewports are not always whole pixels (zoom,
        // fractional device ratios), and `max-width: 1023px` misses a 1023.33px
        // viewport that is still below Tailwind's lg. This mirrors the
        // `min-width` breakpoint exactly.
        query = window.matchMedia(`(max-width: ${maxWidth - 0.02}px)`);
        queries.set(maxWidth, query);
    }

    return query;
}

function getServerSnapshot(): boolean {
    return false;
}

/**
 * True while the viewport is narrower than `maxWidth`. Pass a Tailwind
 * breakpoint so the JS branch and the CSS agree on where the cut is.
 */
export function useIsNarrowerThan(maxWidth: number): boolean {
    const subscribe = useCallback(
        (callback: () => void) => {
            const query = queryFor(maxWidth);

            if (!query) {
                return () => {};
            }

            query.addEventListener('change', callback);

            return () => {
                query.removeEventListener('change', callback);
            };
        },
        [maxWidth],
    );

    const getSnapshot = useCallback(
        () => queryFor(maxWidth)?.matches ?? false,
        [maxWidth],
    );

    return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export function useIsMobile(): boolean {
    return useIsNarrowerThan(MOBILE_BREAKPOINT);
}
