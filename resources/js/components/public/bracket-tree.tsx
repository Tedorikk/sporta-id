import { CheckCircle2, Circle, Play, Trophy } from 'lucide-react';
import type { GameMatch } from '@/types/game-match';

interface Props {
    matches: GameMatch[];
}

const ROUND_ORDER = ['round_of_16', 'quarterfinal', 'semifinal', 'final'];

const ROUND_LABELS: Record<string, string> = {
    round_of_16: 'Round of 16',
    quarterfinal: 'Quarterfinal',
    semifinal: 'Semifinal',
    final: 'Final',
};

function BracketSlot({ match }: { match: GameMatch }) {
    const homeName = match.home_team?.name ?? 'TBD';
    const awayName = match.away_team?.name ?? 'TBD';
    const isCompleted = match.status === 'finished';

    const homeWon = isCompleted && match.home_score !== null && match.away_score !== null && match.home_score > match.away_score;
    const awayWon = isCompleted && match.home_score !== null && match.away_score !== null && match.away_score > match.home_score;

    return (
        <div className="flex min-w-[180px] flex-col overflow-hidden rounded-lg border-2 border-white/10 bg-black/30">
            <div className={`flex items-center justify-between gap-2 border-b border-white/10 px-3 py-2 ${homeWon ? 'bg-red-600/20' : ''}`}>
                <span className={`truncate text-sm ${homeWon ? 'font-semibold text-red-400' : match.home_team ? 'text-white/80' : 'text-white/30 italic'}`}>
                    {homeName}
                </span>
                <span className={`min-w-[1.5rem] text-right text-sm font-bold tabular-nums ${homeWon ? 'text-red-400' : 'text-white/40'}`}>
                    {isCompleted && match.home_score !== null ? match.home_score : '—'}
                </span>
            </div>
            <div className={`flex items-center justify-between gap-2 px-3 py-2 ${awayWon ? 'bg-red-600/20' : ''}`}>
                <span className={`truncate text-sm ${awayWon ? 'font-semibold text-red-400' : match.away_team ? 'text-white/80' : 'text-white/30 italic'}`}>
                    {awayName}
                </span>
                <span className={`min-w-[1.5rem] text-right text-sm font-bold tabular-nums ${awayWon ? 'text-red-400' : 'text-white/40'}`}>
                    {isCompleted && match.away_score !== null ? match.away_score : '—'}
                </span>
            </div>
            <div className="flex items-center justify-between border-t border-white/10 bg-white/5 px-3 py-1 text-[10px] text-white/40">
                <span>{match.match_number ? `#${match.match_number}` : ''}</span>
                {match.status === 'finished' && <CheckCircle2 className="h-3 w-3 text-emerald-400" />}
                {match.status === 'ongoing' && <Play className="h-3 w-3 text-amber-400" />}
                {match.status === 'scheduled' && <Circle className="h-3 w-3 text-white/20" />}
            </div>
        </div>
    );
}

export function BracketTree({ matches }: Props) {
    const knockoutMatches = matches.filter((match) => match.round && match.round !== 'group');

    const rounds = ROUND_ORDER.map((round) => ({
        round,
        matches: knockoutMatches.filter((match) => match.round === round),
    })).filter((group) => group.matches.length > 0);

    const otherRounds = Array.from(new Set(knockoutMatches.map((m) => m.round))).filter(
        (round): round is string => Boolean(round) && !ROUND_ORDER.includes(round as string),
    );

    const allRounds = [
        ...rounds,
        ...otherRounds.map((round) => ({ round, matches: knockoutMatches.filter((m) => m.round === round) })),
    ];

    if (allRounds.length === 0) {
        return null;
    }

    return (
        <div className="flex flex-col gap-3">
            <h4 className="text-sm font-bold tracking-wide text-white/70 uppercase">Bracket</h4>
            <div className="overflow-x-auto rounded-xl border-2 border-white/10 bg-black/20 p-4">
                <div className="flex min-w-max items-start gap-6">
                    {allRounds.map(({ round, matches: roundMatches }) => (
                        <div key={round} className="flex min-w-[200px] flex-col gap-2">
                            <div
                                className={`rounded-md px-2 py-1 text-center text-xs font-semibold tracking-wide uppercase ${
                                    round === 'final' ? 'bg-amber-500/20 text-amber-300' : 'bg-white/10 text-white/60'
                                }`}
                            >
                                {round === 'final' && <Trophy className="mr-1 inline h-3 w-3" />}
                                {ROUND_LABELS[round] ?? round}
                            </div>
                            <div className="flex h-full flex-col justify-around gap-4">
                                {roundMatches.map((match) => (
                                    <BracketSlot key={match.id} match={match} />
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
