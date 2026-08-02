import type { BasketballEventCategory } from './basketball-event-category';
import type { Pool } from './pool';
import type { Team } from './team';

export type MatchStatus = 'scheduled' | 'ongoing' | 'finished';

export interface GameMatch {
    id: number;
    basketball_event_category_id: number;
    pool_id: number | null;
    round: string | null;
    match_number: number | null;
    home_team_id: number | null;
    away_team_id: number | null;
    home_source_match_id: number | null;
    away_source_match_id: number | null;
    home_score: number | null;
    away_score: number | null;
    status: MatchStatus;
    scheduled_at: string | null;
    venue: string | null;
    home_team?: Team | null;
    away_team?: Team | null;
    pool?: Pool | null;
    category?: BasketballEventCategory | null;
    created_at: string;
    updated_at: string;
}

export interface StandingRow {
    team_id: number;
    played: number;
    won: number;
    lost: number;
    points_for: number;
    points_against: number;
    points: number;
    point_diff: number;
}
