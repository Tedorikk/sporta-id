import type { AttendeeType } from './attendee-type';
import type { Event } from './event';

export type AttendeeStatus = 'active' | 'revoked';

export const ATTENDEE_STATUSES: { value: AttendeeStatus; label: string }[] = [
    { value: 'active', label: 'Active' },
    { value: 'revoked', label: 'Revoked' },
];

export interface Attendee {
    id: number;
    event_id: number;
    attendee_type_id: number;
    name: string;
    photo: string | null;
    organization: string | null;
    title: string | null;
    email: string | null;
    phone: string | null;
    qr_token: string;
    /** Short human-comparable code printed on the card; see HasVerificationCode. */
    verification_code: string | null;
    status: AttendeeStatus;
    notes: string | null;
    created_at: string;
    updated_at: string;
    attendee_type?: AttendeeType;
    event?: Event;
}

export interface PaginatedAttendees {
    data: Attendee[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    from: number | null;
    to: number | null;
    links: { url: string | null; label: string; active: boolean }[];
}
