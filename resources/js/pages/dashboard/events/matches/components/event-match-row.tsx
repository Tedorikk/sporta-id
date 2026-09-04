import { Trophy } from 'lucide-react';
import { LocalTime } from '@/components/local-time';
import { Badge } from '@/components/ui/badge';

import {
    StatusBadge,
    ROUND_LABELS,
} from '@/pages/dashboard/events/basketball/matches/components/constants';
import { DeleteMatchButton } from '@/pages/dashboard/events/basketball/matches/components/delete-match-button';
import { EditMatchDialog } from '@/pages/dashboard/events/basketball/matches/components/edit-match-dialog';
import { ScoreDialog } from '@/pages/dashboard/events/basketball/matches/components/score-dialog';
import type { Event } from '@/types/event';
import type { GameMatch } from '@/types/game-match';
import type { Pool } from '@/types/pool';
import type { Team } from '@/types/team';

export function EventMatchRow({
    event,
    match,
    pools,
    teams,
}: {
    event: Event;
    match: GameMatch;
    pools: Pool[];
    teams: Team[];
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

    // Every match belongs to a category — always eager-loaded by EventMatchController@index.
    const category = match.category!;

    return (
        <div className="flex flex-col gap-2 rounded-lg border bg-card px-4 py-3 shadow-sm">
            <div className="flex flex-wrap items-center gap-1.5 text-xs">
                <Badge variant="outline">{category.name}</Badge>
                {match.pool && (
                    <Badge variant="outline">{match.pool.name}</Badge>
                )}
                {match.round && (
                    <Badge variant="secondary">
                        {ROUND_LABELS[match.round] ?? match.round}
                    </Badge>
                )}
                {match.scheduled_at && (
                    <span className="text-muted-foreground">
                        <LocalTime value={match.scheduled_at} />
                    </span>
                )}
            </div>

            <div className="flex items-center gap-3">
                {match.match_number && (
                    <span className="w-5 shrink-0 text-xs text-muted-foreground">
                        #{match.match_number}
                    </span>
                )}

                <div className="flex min-w-0 flex-1 items-center gap-2">
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

                <div className="flex shrink-0 items-center gap-1">
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
