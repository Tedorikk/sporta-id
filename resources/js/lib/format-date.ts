export function formatDate(date?: string | null) {
    if (!date) {
        return 'N/A';
    }

    return new Date(date).toLocaleDateString();
}
