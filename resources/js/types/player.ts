export interface Player {
    id: number;
    team_id: number;
    name: string;
    jersey_number: string;
    position: string | null;
    photo: string | null;
    phone_number: string | null;
    email: string | null;
    dob: string | null;
    qr_token: string;
    created_at: string;
    updated_at: string;
}