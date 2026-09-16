export function isFreePrice(
    price: string | number | null | undefined,
): boolean {
    return !price || Number(price) === 0;
}

/**
 * The price tag public pages print beside a category: the amount when there
 * is one, nothing when it's free — a bare "Free" label is clutter next to
 * every free entry. The pay step still uses formatRupiah() for the amount.
 */
export function formatPublicPrice(
    price: string | number | null | undefined,
): string | null {
    return isFreePrice(price) ? null : formatRupiah(price ?? null);
}

export function formatRupiah(price: string | number | null): string {
    if (isFreePrice(price)) {
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
    from?: string | number | null,
    to?: string | number | null,
): string | null {
    if (from === null || from === undefined) {
        return null;
    }

    if (to === null || to === undefined || Number(from) === Number(to)) {
        return formatRupiah(from);
    }

    return `${formatRupiah(from)} – ${formatRupiah(to)}`;
}
