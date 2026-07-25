export function formatDate(date?: string | null) {
    if (!date) {
        return 'N/A';
    }

    return new Date(date).toLocaleDateString();
}

export function formatDateTime(date?: string | null) {
    if (!date) {
        return 'N/A';
    }

    return new Date(date).toLocaleString(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short',
    });
}
