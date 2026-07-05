export type TeamStatus = 'pending' | 'verified' | 'rejected';

export const TEAM_STATUSES: { value: TeamStatus; label: string }[] = [
    { value: 'pending', label: 'Menunggu' },
    { value: 'verified', label: 'Terverifikasi' },
    { value: 'rejected', label: 'Ditolak' },
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
}