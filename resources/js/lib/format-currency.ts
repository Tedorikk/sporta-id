export function formatRupiah(price: string | null): string {
    if (!price || Number(price) === 0) {
        return 'Free';
    }

    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        maximumFractionDigits: 0,
    }).format(Number(price));
}

/**
 * Price line for an event card, built from the cheapest and dearest of its
 * registration categories. Returns null when the event has no categories at
 * all — the card then shows no price rather than a misleading "Free".
 */
export function formatPriceRange(
    from?: string | null,
    to?: string | null,
): string | null {
    if (from === null || from === undefined) {
        return null;
    }

    if (to === null || to === undefined || Number(from) === Number(to)) {
        return formatRupiah(from);
    }

    return `${formatRupiah(from)} – ${formatRupiah(to)}`;
}
