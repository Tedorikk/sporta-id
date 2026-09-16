import type { Event } from './event';
import type { Registration } from './registration';

export type RegistrationOrderStatus =
    'pending_payment' | 'confirmed' | 'rejected' | 'cancelled' | 'expired';

/**
 * A group checkout: one buyer, several participants, one payment for their
 * summed total. Mirrors App\Models\RegistrationOrder.
 */
export interface RegistrationOrder {
    id: number;
    event_id: number;
    qr_token: string;
    status: RegistrationOrderStatus;
    expires_at: string | null;
    created_at: string;
    event?: Event;
    registrations?: Registration[];
}
