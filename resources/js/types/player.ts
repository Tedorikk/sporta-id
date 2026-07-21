import type { Team } from './team';

export type PlayerRole = 'player' | 'coach' | 'assistant_coach' | 'manager' | 'officer';

export const PLAYER_ROLES: { value: PlayerRole; label: string }[] = [
    { value: 'player', label: 'Player' },
    { value: 'coach', label: 'Coach' },
    { value: 'assistant_coach', label: 'Assistant Coach' },
    { value: 'manager', label: 'Manager' },
    { value: 'officer', label: 'Officer' },
];

export function playerRoleLabel(role: PlayerRole): string {
    return PLAYER_ROLES.find((r) => r.value === role)?.label ?? role;
}

export interface Player {
    id: number;
    name: string;
    role: PlayerRole;
    jersey_number: string | null;
    position: string | null;
    photo: string | null;
    certificate: string | null;
    is_certificate_validated: boolean;
    phone_number: string | null;
    email: string | null;
    dob: string | null;
    qr_token: string;
    basketball_club_id: number;
    basketball_club: BasketballClub;
    teams?: Team[];
    created_at: string;
    updated_at: string;
}

export interface BasketballClub {
    id: number;
    name: string;
    players?: Player[];
}
