import type { BasketballEventCategory } from "./basketball-event-category";
import type { Pool } from './pool';
import type { Team } from './team';

export type EventStatus = 'upcoming' | 'ongoing' | 'past';

export interface BasketballEventSpecific {
    id: number;
    pool_drawing_date: string | null;
    registration_open: boolean;
}

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
    logo: string | null;
    instagram_url: string | null;
    facebook_url: string | null;
    youtube_url: string | null;
    whatsapp_url: string | null;
    status: EventStatus;
    specific_type: 'BasketballEvent' | null;
    specific?: BasketballEventSpecific | null;
    teams_count?: number;
    pools_count?: number;
    matches_count?: number;
    basketball_categories?: BasketballEventCategory[];
    pools?: Pool[];
    teams?: Team[];
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
