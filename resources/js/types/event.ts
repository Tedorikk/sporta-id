export type Event = {
    id: number;
    name: string;
    description?: string | null;
    contact_person?: string | null;
    category?: string | null;
    is_published?: boolean | false;
    start_date?: string | null;
    end_date?: string | null;
    banner?: string | null;
    created_at: string;
    updated_at: string;
};

export const EVENT_CATEGORIES = [{ value: 'BASKETBALL', label: 'Basketball' }];
