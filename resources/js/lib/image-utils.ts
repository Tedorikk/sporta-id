export function formatImageUrl(url: string): string {
    const appUrl = import.meta.env.VITE_APP_URL; // e.g. "http://localhost:8000"

    if (appUrl && url.startsWith(appUrl)) {
        return url.slice(appUrl.length);
    }

    return url;
}
