import type { RegistrationCategory } from './registration-category';

/** One distance of a running event — a 5K, a 10K, a half marathon. */
export interface RunningEventCategory {
    id: number;
    running_event_id: number;
    registration_category_id: number | null;
    name: string;
    slug: string;
    distance_meters: number;
    /** Wave start. Null until the schedule is fixed. */
    start_at: string | null;
    cutoff_minutes: number | null;
    bib_prefix: string | null;
    bib_start_number: number;
    price: string | number | null;
    quota: number | null;
    status: string;
    registration_category?: Pick<RegistrationCategory, 'id' | 'name'> | null;
    participants_count?: number;
    finishers_count?: number;
}
