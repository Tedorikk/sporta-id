import { Calendar, Trophy } from 'lucide-react';
import { formatDateTime } from '@/lib/format-date';
import type { BasketballEventCategory } from '@/types/basketball-event-category';
import type { Event } from '@/types/event';
import type { GameMatch } from '@/types/game-match';
import { StatusBadge } from './constants';
import { DeleteMatchButton } from './delete-match-button';
import { ScoreDialog } from './score-dialog';

export function MatchCard({
    event,
    category,
    match,
}: {
    event: Event;
    category: BasketballEventCategory;
    match: GameMatch;
}) {
    const homeName = match.home_team?.name ?? 'TBD';
    const awayName = match.away_team?.name ?? 'TBD';
    const isCompleted = match.status === 'finished';

    const homeWon = isCompleted && match.home_score !== null && match.away_score !== null
        && match.home_score > match.away_score;
    const awayWon = isCompleted && match.home_score !== null && match.away_score !== null
        && match.away_score > match.home_score;

    return (
        <div className="flex items-center gap-3 rounded-lg border bg-card px-4 py-3 shadow-sm">
            {match.match_number && (
                <span className="text-xs text-muted-foreground w-5 shrink-0">#{match.match_number}</span>
            )}

            <div className="flex flex-1 items-center gap-2 min-w-0">
                <span className={`flex-1 text-sm font-medium truncate text-right ${homeWon ? 'text-primary' : ''}`}>
                    {homeName}
                    {homeWon && <Trophy className="inline h-3 w-3 ml-1 text-amber-500" />}
                </span>

                <div className="flex items-center gap-1 shrink-0">
                    {isCompleted && match.home_score !== null ? (
                        <div className="flex items-center gap-1.5">
                            <span className={`text-lg font-bold tabular-nums ${homeWon ? 'text-primary' : 'text-muted-foreground'}`}>
                                {match.home_score}
                            </span>
                            <span className="text-muted-foreground">–</span>
                            <span className={`text-lg font-bold tabular-nums ${awayWon ? 'text-primary' : 'text-muted-foreground'}`}>
                                {match.away_score}
                            </span>
                        </div>
                    ) : (
                        <span className="text-sm text-muted-foreground px-2">vs</span>
                    )}
                </div>

                <span className={`flex-1 text-sm font-medium truncate ${awayWon ? 'text-primary' : ''}`}>
                    {awayWon && <Trophy className="inline h-3 w-3 mr-1 text-amber-500" />}
                    {awayName}
                </span>
            </div>

            {match.scheduled_at && (
                <span className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
                    <Calendar className="h-3 w-3" />
                    {formatDateTime(match.scheduled_at)}
                </span>
            )}

            <div className="flex items-center gap-1 shrink-0">
                <StatusBadge status={match.status} />
                <ScoreDialog event={event} category={category} match={match} />
                <DeleteMatchButton event={event} category={category} match={match} />
            </div>
        </div>
    );
}