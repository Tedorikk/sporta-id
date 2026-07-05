export type EventStatus = 'upcoming' | 'ongoing' | 'past';

export interface Event {
    id: number;
    name: string;
    description: string | null;
    contact_person: string;
    category: string;
    is_published: boolean;
    start_date: string;
    end_date: string;
    banner: string | null;
    status: EventStatus;
    specific_type: 'BasketballEvent' | null;
    teams_count?: number;
    pools_count?: number;
    matches_count?: number;
}

export const EVENT_CATEGORIES = [{ value: 'BASKETBALL', label: 'Basketball' }];

export interface PaginatedEvents {
    data: Event[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    from: number | null;
    to: number | null;
    links: { url: string | null; label: string; active: boolean }[];
}

export interface EventFilters {
    search?: string;
    category?: string;
    status?: string;
}

export interface EventStats {
    total: number;
    published: number;
    upcoming: number;
    ongoing: number;
    past: number;
}
