export interface BasketballEventCategory {
    id: number;
    basketball_event_id: number;
    name: string;
    slug: string;
    format: 'round_robin' | 'pool_stage' | string;
    win_points: number;
    loss_points: number;
    min_team: number;
    max_team: number | null;
    min_player_per_team: number;
    max_player_per_team: number | null;
    max_player_per_coach: number | null;
    price: string | null;
    quota: number | null;
    status: string;
    created_at: string;
    updated_at: string;
}
