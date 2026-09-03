const SNAP_SCRIPT_ID = 'midtrans-snap-js';

let loadPromise: Promise<void> | null = null;

/**
 * Injects Midtrans's Snap.js on demand — most pages never need it, so it's
 * loaded only when a registration actually needs to pay, not globally.
 * Safe to call repeatedly; the script tag (and the load promise) are only
 * ever created once. Sandbox and production are served from different
 * URLs, so `isProduction` must match whichever key generated the snap token.
 */
export function loadSnapScript(
    clientKey: string,
    isProduction: boolean,
): Promise<void> {
    if (window.snap) {
        return Promise.resolve();
    }

    if (loadPromise) {
        return loadPromise;
    }

    loadPromise = new Promise((resolve, reject) => {
        const existing = document.getElementById(SNAP_SCRIPT_ID);

        if (existing) {
            existing.addEventListener('load', () => resolve());

            return;
        }

        const script = document.createElement('script');
        script.id = SNAP_SCRIPT_ID;
        script.src = isProduction
            ? 'https://app.midtrans.com/snap/snap.js'
            : 'https://app.sandbox.midtrans.com/snap/snap.js';
        script.dataset.clientKey = clientKey;
        script.onload = () => resolve();
        script.onerror = () =>
            reject(new Error('Could not load the payment provider script.'));
        document.head.appendChild(script);
    });

    return loadPromise;
}
