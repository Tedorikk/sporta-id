import type { Event } from './event';
import type { Speaker } from './speaker';

export interface Meeting {
    id: number;
    event_id: number;
    speaker_id: number | null;
    title: string;
    description: string | null;
    location: string | null;
    scheduled_at: string;
    ends_at: string | null;
    speaker?: Speaker | null;
    event?: Event;
    check_ins_count?: number;
}
