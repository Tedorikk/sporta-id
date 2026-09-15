import type { RegistrationCategory } from '@/types/registration-category';

export interface BasketballEventCategory {
    id: number;
    basketball_event_id: number;
    name: string;
    slug: string;
    format: 'round_robin' | 'pool_stage' | string;
    win_points: number;
    loss_points: number;
    min_team: number;
    min_player_per_team: number;
    max_player_per_team: number | null;
    max_player_per_coach: number | null;
    /** Roster edits close here; null means "when registration closes". */
    roster_closes_at: string | null;
    registration_category_id: number;
    /** Price, quota and the open/close window live here — present when the page loads it. */
    registration_category?: RegistrationCategory;
    created_at: string;
    updated_at: string;
}
