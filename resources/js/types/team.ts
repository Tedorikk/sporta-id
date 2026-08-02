import type { BasketballEventCategory } from './basketball-event-category';
import type { Event } from './event';
import type { GameMatch } from './game-match';
import type { Player } from './player';

export type TeamStatus = 'pending' | 'verified' | 'rejected';

export const TEAM_STATUSES: { value: TeamStatus; label: string }[] = [
    { value: 'pending', label: 'Pending' },
    { value: 'verified', label: 'Verified' },
    { value: 'rejected', label: 'Rejected' },
];

export type IssueSeverity = 'error' | 'warning' | 'info';

export interface ReviewIssue {
    severity: IssueSeverity;
    code: string;
    message: string;
}

export interface ReviewSummary {
    total: number;
    errors: number;
    warnings: number;
    info: number;
}

export interface TeamReview {
    team_issues: ReviewIssue[];
    player_issues: Record<number, ReviewIssue[]>;
    summary: ReviewSummary;
}

export interface Team {
    id: number;
    event_id: number;
    name: string;
    logo: string | null;
    status: TeamStatus;
    created_at: string;
    updated_at: string;
    players?: Player[];
    basketball_event_category_id: number | null;
    basketball_event_category?: BasketballEventCategory;
    event?: Event;
    review_summary?: ReviewSummary;
    next_match_today?: GameMatch | null;
}

export interface PaginatedTeams {
    data: Team[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    from: number | null;
    to: number | null;
    links: { url: string | null; label: string; active: boolean }[];
}