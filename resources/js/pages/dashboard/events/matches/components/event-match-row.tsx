import { Trophy } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { formatDateTime } from '@/lib/format-date';
import { StatusBadge, ROUND_LABELS } from '@/pages/dashboard/events/basketball/matches/components/constants';
import { DeleteMatchButton } from '@/pages/dashboard/events/basketball/matches/components/delete-match-button';
import { ScoreDialog } from '@/pages/dashboard/events/basketball/matches/components/score-dialog';
import type { Event } from '@/types/event';
import type { GameMatch } from '@/types/game-match';

export function EventMatchRow({ event, match }: { event: Event; match: GameMatch }) {
    const homeName = match.home_team?.name ?? 'TBD';
    const awayName = match.away_team?.name ?? 'TBD';
    const isCompleted = match.status === 'finished';

    const homeWon = isCompleted && match.home_score !== null && match.away_score !== null
        && match.home_score > match.away_score;
    const awayWon = isCompleted && match.home_score !== null && match.away_score !== null
        && match.away_score > match.home_score;

    // Every match belongs to a category — always eager-loaded by EventMatchController@index.
    const category = match.category!;

    return (
        <div className="flex flex-col gap-2 rounded-lg border bg-card px-4 py-3 shadow-sm">
            <div className="flex flex-wrap items-center gap-1.5 text-xs">
                <Badge variant="outline">{category.name}</Badge>
                {match.pool && <Badge variant="outline">{match.pool.name}</Badge>}
                {match.round && (
                    <Badge variant="secondary">{ROUND_LABELS[match.round] ?? match.round}</Badge>
                )}
                {match.scheduled_at && (
                    <span className="text-muted-foreground">{formatDateTime(match.scheduled_at)}</span>
                )}
            </div>

            <div className="flex items-center gap-3">
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

                <div className="flex items-center gap-1 shrink-0">
                    <StatusBadge status={match.status} />
                    <ScoreDialog event={event} category={category} match={match} />
                    <DeleteMatchButton event={event} category={category} match={match} />
                </div>
            </div>
        </div>
    );
}
