import { Calendar, Trophy } from 'lucide-react';
import { LocalTime } from '@/components/local-time';

import type { BasketballEventCategory } from '@/types/basketball-event-category';
import type { Event } from '@/types/event';
import type { GameMatch } from '@/types/game-match';
import type { Pool } from '@/types/pool';
import type { Team } from '@/types/team';
import { StatusBadge } from './constants';
import { DeleteMatchButton } from './delete-match-button';
import { EditMatchDialog } from './edit-match-dialog';
import { ScoreDialog } from './score-dialog';

export function MatchCard({
    event,
    category,
    pools,
    teams,
    match,
}: {
    event: Event;
    category: BasketballEventCategory;
    pools: Pool[];
    teams: Team[];
    match: GameMatch;
}) {
    const homeName = match.home_team?.name ?? 'TBD';
    const awayName = match.away_team?.name ?? 'TBD';
    const isCompleted = match.status === 'finished';

    const homeWon =
        isCompleted &&
        match.home_score !== null &&
        match.away_score !== null &&
        match.home_score > match.away_score;
    const awayWon =
        isCompleted &&
        match.home_score !== null &&
        match.away_score !== null &&
        match.away_score > match.home_score;

    return (
        // The matchup gets the full width on a phone; the meta and controls
        // drop to a second line rather than squeezing the team names to nothing.
        <div className="flex flex-col gap-2 rounded-lg border bg-card px-3 py-3 shadow-sm sm:flex-row sm:items-center sm:gap-3 sm:px-4">
            <div className="flex min-w-0 flex-1 items-center gap-2">
                {match.match_number && (
                    <span className="w-5 shrink-0 text-xs text-muted-foreground">
                        #{match.match_number}
                    </span>
                )}
                <span
                    className={`flex-1 truncate text-right text-sm font-medium ${homeWon ? 'text-primary' : ''}`}
                >
                    {homeName}
                    {homeWon && (
                        <Trophy className="ml-1 inline h-3 w-3 text-amber-500" />
                    )}
                </span>

                <div className="flex shrink-0 items-center gap-1">
                    {isCompleted && match.home_score !== null ? (
                        <div className="flex items-center gap-1.5">
                            <span
                                className={`text-lg font-bold tabular-nums ${homeWon ? 'text-primary' : 'text-muted-foreground'}`}
                            >
                                {match.home_score}
                            </span>
                            <span className="text-muted-foreground">–</span>
                            <span
                                className={`text-lg font-bold tabular-nums ${awayWon ? 'text-primary' : 'text-muted-foreground'}`}
                            >
                                {match.away_score}
                            </span>
                        </div>
                    ) : (
                        <span className="px-2 text-sm text-muted-foreground">
                            vs
                        </span>
                    )}
                </div>

                <span
                    className={`flex-1 truncate text-sm font-medium ${awayWon ? 'text-primary' : ''}`}
                >
                    {awayWon && (
                        <Trophy className="mr-1 inline h-3 w-3 text-amber-500" />
                    )}
                    {awayName}
                </span>
            </div>

            <div className="flex shrink-0 flex-wrap items-center gap-1 sm:gap-2">
                {match.scheduled_at && (
                    <span className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        <LocalTime value={match.scheduled_at} />
                    </span>
                )}

                <div className="ml-auto flex shrink-0 items-center gap-1 sm:ml-0">
                    <StatusBadge status={match.status} />
                    <EditMatchDialog
                        event={event}
                        category={category}
                        pools={pools}
                        teams={teams}
                        match={match}
                    />
                    <ScoreDialog
                        event={event}
                        category={category}
                        match={match}
                    />
                    <DeleteMatchButton
                        event={event}
                        category={category}
                        match={match}
                    />
                </div>
            </div>
        </div>
    );
}
