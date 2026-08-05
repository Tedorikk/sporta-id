export function formatRupiah(price: string | null): string {
    if (!price || Number(price) === 0) {
        return 'Free';
    }

    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(Number(price));
}
