import { useEffect } from 'react';

/**
 * Public-facing pages (landing, registration, ID cards, lookup) have a fixed
 * light/white card design regardless of the visitor's OS dark-mode preference.
 * The app's global appearance toggle adds a `.dark` class to <html>, which
 * would otherwise flip shadcn's theme-token text colors (e.g. FieldLabel)
 * to near-white and make them invisible against the hardcoded white card.
 * This forces light mode while the page is mounted and restores whatever
 * was there before on unmount (Inertia navigation keeps <html> around).
 */
export function useForceLightMode() {
    useEffect(() => {
        const root = document.documentElement;
        const hadDark = root.classList.contains('dark');
        const previousColorScheme = root.style.colorScheme;

        root.classList.remove('dark');
        root.style.colorScheme = 'light';

        return () => {
            if (hadDark) {
                root.classList.add('dark');
            }

            root.style.colorScheme = previousColorScheme;
        };
    }, []);
}
