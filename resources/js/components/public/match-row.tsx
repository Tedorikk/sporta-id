import { Calendar, Trophy } from 'lucide-react';
import { formatDate } from '@/lib/format-date';
import type { GameMatch } from '@/types/game-match';

const STATUS_STYLE: Record<string, string> = {
    scheduled: 'bg-white/10 text-white/60',
    ongoing: 'bg-amber-500/20 text-amber-300',
    finished: 'bg-emerald-500/20 text-emerald-300',
};

const STATUS_LABEL: Record<string, string> = {
    scheduled: 'Scheduled',
    ongoing: 'Ongoing',
    finished: 'Completed',
};

export function MatchRow({ match }: { match: GameMatch }) {
    const homeName = match.home_team?.name ?? 'TBD';
    const awayName = match.away_team?.name ?? 'TBD';
    const isCompleted = match.status === 'finished';
    const homeWon = isCompleted && (match.home_score ?? 0) > (match.away_score ?? 0);
    const awayWon = isCompleted && (match.away_score ?? 0) > (match.home_score ?? 0);

    return (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border-2 border-white/10 bg-white/5 px-4 py-3">
            {match.match_number && <span className="w-6 shrink-0 text-xs text-white/40">#{match.match_number}</span>}

            <div className="flex min-w-0 flex-1 items-center gap-2">
                <span className={`flex-1 truncate text-right text-sm font-semibold ${homeWon ? 'text-red-400' : 'text-white/80'}`}>
                    {homeWon && <Trophy className="mr-1 inline h-3 w-3 text-amber-400" />}
                    {homeName}
                </span>

                <div className="shrink-0">
                    {isCompleted && match.home_score !== null ? (
                        <div className="flex items-center gap-1.5">
                            <span className={`text-lg font-black tabular-nums ${homeWon ? 'text-red-400' : 'text-white/50'}`}>
                                {match.home_score}
                            </span>
                            <span className="text-white/30">–</span>
                            <span className={`text-lg font-black tabular-nums ${awayWon ? 'text-red-400' : 'text-white/50'}`}>
                                {match.away_score}
                            </span>
                        </div>
                    ) : (
                        <span className="px-2 text-xs text-white/40">vs</span>
                    )}
                </div>

                <span className={`flex-1 truncate text-sm font-semibold ${awayWon ? 'text-red-400' : 'text-white/80'}`}>
                    {awayName}
                    {awayWon && <Trophy className="ml-1 inline h-3 w-3 text-amber-400" />}
                </span>
            </div>

            <div className="flex shrink-0 items-center gap-2">
                {match.scheduled_at && (
                    <span className="flex items-center gap-1 text-xs text-white/40">
                        <Calendar className="h-3 w-3" />
                        {formatDate(match.scheduled_at)}
                    </span>
                )}
                <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wide uppercase ${STATUS_STYLE[match.status]}`}
                >
                    {STATUS_LABEL[match.status]}
                </span>
            </div>
        </div>
    );
}
