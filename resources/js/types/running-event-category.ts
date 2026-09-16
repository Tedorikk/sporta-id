import type { RegistrationCategory } from './registration-category';

/**
 * One distance of a running event — a 5K, a 10K, a half marathon: its start
 * time, cut-off and bib ranges. Runners buy a registration category that
 * names this distance ("5K with jersey", "5K without jersey" can both feed
 * the same start list).
 */
export interface RunningEventCategory {
    id: number;
    running_event_id: number;
    name: string;
    slug: string;
    distance_meters: number;
    /** Wave start. Null until the schedule is fixed. */
    start_at: string | null;
    cutoff_minutes: number | null;
    bib_prefix: string | null;
    bib_start_number: number;
    /** Independent men's/women's bib sequences; null falls back to bib_start_number. */
    bib_start_male: number | null;
    bib_start_female: number | null;
    /** Checked against the runner's date of birth at sign-up, on race day. */
    minimum_age: number | null;
    /** Every registration category currently selling this distance. */
    registration_categories?: Pick<
        RegistrationCategory,
        | 'id'
        | 'name'
        | 'price'
        | 'quota'
        | 'registered_count'
        | 'registration_open'
    >[];
    participants_count?: number;
    finishers_count?: number;
}
