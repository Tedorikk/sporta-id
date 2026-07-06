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
    basketball_club_id: number;
    basketball_club: BasketballClub;
    created_at: string;
    updated_at: string;
}

export interface BasketballClub {
    id: number;
    name: string;
    players?: Player[];
}
