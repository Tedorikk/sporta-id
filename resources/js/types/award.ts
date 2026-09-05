export type AwardNomineeKind = 'player' | 'team';

export type AwardVoterType = 'public' | 'registrant' | 'attendee';

export type AwardStatus = 'draft' | 'open' | 'closed';

export type AwardResultsVisibility = 'after_close' | 'live' | 'admin_only';

export interface Award {
    id: number;
    event_id: number;
    title: string;
    description: string | null;
    nominee_kind: AwardNomineeKind;
    allowed_voters: AwardVoterType[];
    status: AwardStatus;
    results_visibility: AwardResultsVisibility;
    is_paid: boolean;
    /** Whole rupiah — Midtrans charges an integer amount. */
    price_per_vote: number | null;
    max_votes_per_transaction: number | null;
    max_votes_per_voter: number | null;
    opens_at: string | null;
    closes_at: string | null;
    /** Present on the index listing only. */
    nominees_count?: number;
    votes_total?: number | null;
    revenue_total?: number | null;
}

export interface AwardNominee {
    id: number;
    award_id: number;
    nominee_type: string;
    nominee_id: number;
    display_name: string | null;
    photo: string | null;
    /** The ballot label: the override if set, otherwise the player/team name. */
    name: string;
    photo_url: string | null;
    sort_order: number;
    /** Settled votes only. Null on a public ballot with results hidden. */
    votes_total?: number | null;
    voters_count?: number;
}

/** A player or team at this event that is not on the ballot yet. */
export interface AwardCandidate {
    id: number;
    name: string;
    photo: string | null;
}

export interface AwardStats {
    votes_counted: number;
    votes_pending: number;
    ballots_counted: number;
    revenue_settled: number;
}

/** The award as the public voting page receives it. */
export interface PublicAward extends Pick<
    Award,
    | 'id'
    | 'title'
    | 'description'
    | 'nominee_kind'
    | 'allowed_voters'
    | 'status'
    | 'is_paid'
    | 'price_per_vote'
    | 'max_votes_per_transaction'
    | 'max_votes_per_voter'
    | 'opens_at'
    | 'closes_at'
> {
    is_open: boolean;
    has_closed: boolean;
    results_are_public: boolean;
    allows_anonymous: boolean;
}

export interface PublicBallotNominee {
    id: number;
    name: string;
    photo: string | null;
    /** Null while this award keeps its results hidden. */
    votes_total: number | null;
}

export interface BallotVoter {
    name: string;
    kind: 'registrant' | 'attendee';
    token: string;
}

export type VoteStatus = 'pending' | 'counted' | 'void';

export interface VoteReceipt {
    reference: string;
    quantity: number;
    status: VoteStatus;
    amount: number | null;
    voter_name: string | null;
    nominee_name: string | null;
}
