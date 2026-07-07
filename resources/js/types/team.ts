import { BasketballEventCategory } from './basketball-event-category';
import type { Player } from './player';

export type TeamStatus = 'pending' | 'verified' | 'rejected';

export const TEAM_STATUSES: { value: TeamStatus; label: string }[] = [
    { value: 'pending', label: 'Pending' },
    { value: 'verified', label: 'Verified' },
    { value: 'rejected', label: 'Rejected' },
];

export interface Team {
    id: number;
    event_id: number;
    name: string;
    manager_name: string;
    manager_phone: string;
    logo: string | null;
    status: TeamStatus;
    created_at: string;
    updated_at: string;
    players?: Player[];
    basketball_event_category_id: number | null;
    basketball_event_category?: BasketballEventCategory;
}

export interface PaginatedTeams {
    data: Team[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    from: number | null;
    to: number | null;
    links: { url: string | null; label: string; active: boolean }[];
}