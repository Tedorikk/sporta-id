export interface Speaker {
    id: number;
    event_id: number;
    name: string;
    photo: string | null;
    title: string | null;
    bio: string | null;
    meetings_count?: number;
}
