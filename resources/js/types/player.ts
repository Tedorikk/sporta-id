export interface Player {
    id: number;
    team_id: number;
    name: string;
    jersey_number: string;
    position: string | null;
    qr_token: string;
    created_at: string;
    updated_at: string;
}