import type { Event } from './event';
import type { Payment } from './payment';
import type { RegistrationCategory } from './registration-category';
import type { Team } from './team';

export type RegistrationStatus =
    'pending_payment' | 'confirmed' | 'rejected' | 'cancelled' | 'expired';

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
    /** Short human-comparable code printed on the card; see Registration::generateVerificationCode. */
    verification_code: string | null;
    form_data: Record<string, unknown> | null;
    status: RegistrationStatus;
    expires_at: string | null;
    confirmation_email_sent_at: string | null;
    confirmation_email_failed_at: string | null;
    confirmation_email_failure: string | null;
    created_at: string;
    registration_category?: RegistrationCategory;
    event?: Event;
    team?: Team | null;
    /** The settled payment, else the latest attempt. Attached by RegistrationCategoryController::show. */
    payment?: Payment | null;
}

export interface PaginatedRegistrations {
    data: Registration[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    from: number | null;
    to: number | null;
    links: { url: string | null; label: string; active: boolean }[];
}

export interface RegistrationFilters {
    search?: string;
    status?: string;
}
