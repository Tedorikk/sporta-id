import type { Event } from './event';
import type { RegistrationCategory } from './registration-category';

export type RegistrationStatus = 'pending_payment' | 'confirmed' | 'rejected' | 'cancelled' | 'expired';

export interface Registration {
    id: number;
    registration_category_id: number;
    event_id: number;
    team_id: number | null;
    name: string;
    email: string | null;
    phone: string | null;
    photo: string | null;
    qr_token: string;
    form_data: Record<string, unknown> | null;
    status: RegistrationStatus;
    expires_at: string | null;
    registration_category?: RegistrationCategory;
    event?: Event;
}
