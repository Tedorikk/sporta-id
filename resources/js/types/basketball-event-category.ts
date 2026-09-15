import type {
    RegistrationCategory,
    TournamentSettings,
} from '@/types/registration-category';

export interface BasketballEventCategory extends TournamentSettings {
    id: number;
    basketball_event_id: number;
    name: string;
    slug: string;
    registration_category_id: number;
    /** Price, quota and the open/close window live here — present when the page loads it. */
    registration_category?: RegistrationCategory;
    created_at: string;
    updated_at: string;
}
