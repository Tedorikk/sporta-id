import type { Team } from './team';

export interface Pool {
    id: number;
    name: string;
    basketball_event_category_id: number;
    teams: Team[];
}