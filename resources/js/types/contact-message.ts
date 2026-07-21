export interface ContactMessage {
    id: number;
    name: string;
    email: string;
    phone: string | null;
    message: string;
    created_at: string;
}

export interface PaginatedContactMessages {
    data: ContactMessage[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    from: number | null;
    to: number | null;
    links: { url: string | null; label: string; active: boolean }[];
}
