export interface AttendeeType {
    id: number;
    event_id: number;
    key: string;
    label: string;
    icon: string | null;
    color: string | null;
    is_active: boolean;
    attendees_count?: number;
}
