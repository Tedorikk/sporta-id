export type RaceParticipantStatus =
    'registered' | 'finished' | 'dnf' | 'dns' | 'dq';

/** A runner on one distance's start list, carrying their bib and their result. */
export interface RaceParticipant {
    id: number;
    running_event_category_id: number;
    registration_id: number | null;
    /** Null until bibs are assigned for the distance. */
    bib_number: string | null;
    name: string;
    email: string | null;
    phone: string | null;
    started_at: string | null;
    finished_at: string | null;
    duration_seconds: number | null;
    status: RaceParticipantStatus;
}

/** A finisher with their place, as computed by RaceRankingService. */
export interface RaceRankingEntry {
    rank: number;
    participant_id: number;
    bib_number: string | null;
    name: string;
    duration_seconds: number;
    /** Seconds per kilometre, for the "5:42 /km" column. */
    pace_seconds_per_km: number;
    /** Seconds behind the winner. 0 for the winner themselves. */
    gap_seconds: number;
}
