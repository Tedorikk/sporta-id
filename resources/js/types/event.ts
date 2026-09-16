import type { BasketballEventCategory } from './basketball-event-category';
import type { Pool } from './pool';
import type {
    PublicRegistrationCategory,
    RegistrationCategory,
} from './registration-category';
import type { RunningEventCategory } from './running-event-category';
import type { Team } from './team';

export type EventStatus = 'upcoming' | 'ongoing' | 'past';

export interface BasketballEventSpecific {
    id: number;
    pool_drawing_date: string | null;
}

export interface RunningEventSpecific {
    id: number;
    registration_open: boolean;
    results_published: boolean;
}

export interface Event {
    id: number;
    name: string;
    description: string | null;
    contact_person: string;
    category: string | null;
    is_published: boolean;
    /** Organiser override: keep taking registrations after the event's last day. */
    registration_after_end: boolean;
    start_date: string;
    end_date: string;
    banner: string | null;
    logo: string | null;
    accent_color: string | null;
    instagram_url: string | null;
    facebook_url: string | null;
    youtube_url: string | null;
    whatsapp_url: string | null;
    status: EventStatus;
    specific_type: 'BasketballEvent' | 'RunningEvent' | null;
    specific?: BasketballEventSpecific | RunningEventSpecific | null;
    /** Cheapest / dearest registration category price, for the "from Rp x" line on cards. Null when the event sells nothing yet. */
    price_from?: string | number | null;
    price_to?: string | number | null;
    /** The purchasable items themselves — sent to the landing page so it doubles as a price list. */
    registration_categories?: PublicRegistrationCategory[];
    attendees_count?: number;
    registration_categories_count?: number;
    teams_count?: number;
    pools_count?: number;
    matches_count?: number;
    basketball_categories?: BasketballEventCategory[];
    running_categories?: RunningEventCategory[];
    /** Sign-up forms of this event, for pickers that link one to a distance. */
    registration_category_options?: Pick<RegistrationCategory, 'id' | 'name'>[];
    pools?: Pool[];
    teams?: Team[];
}

export const EVENT_CATEGORIES = [
    { value: 'BASKETBALL', label: 'Basketball' },
    { value: 'CONFERENCE', label: 'Conference' },
    { value: 'RUNNING', label: 'Running' },
];

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

/** Publication state. Independent of {@link EventTiming} — a draft can be upcoming. */
export type EventLifecycle = 'published' | 'draft';

/** Position relative to today. Independent of {@link EventLifecycle}. */
export type EventTiming = EventStatus;

export interface EventFilters {
    search: string | null;
    category: string | null;
    lifecycle: EventLifecycle | null;
    timing: EventTiming | null;
}

export type EventSortColumn = 'name' | 'start_date' | 'end_date';

export interface EventSort {
    column: EventSortColumn;
    direction: 'asc' | 'desc';
}

export interface EventStats {
    total: number;
    published: number;
    draft: number;
    upcoming: number;
    ongoing: number;
    past: number;
}

/** Event status values are stored in English; these are the keys `t()` translates on public pages. */
export const EVENT_STATUS_LABEL: Record<string, string> = {
    upcoming: 'Upcoming',
    ongoing: 'Ongoing',
    past: 'Past',
};
