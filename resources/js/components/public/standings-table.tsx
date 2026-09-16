import { Trophy } from 'lucide-react';
import { useT } from '@/hooks/use-t';
import type { StandingRow } from '@/types/game-match';
import type { Team } from '@/types/team';

interface Props {
    standings: StandingRow[];
    teams: Team[];
}

export function StandingsTable({ standings, teams }: Props) {
    const { t } = useT();
    const teamMap = Object.fromEntries(teams.map((t) => [t.id, t]));

    if (standings.length === 0) {
        return (
            <p className="text-sm text-white/40">
                {t('No completed matches yet.')}
            </p>
        );
    }

    return (
        <div className="overflow-x-auto">
            <table className="w-full text-xs">
                <thead>
                    <tr className="border-b border-white/15 text-white/50">
                        <th className="py-2 pr-3 text-left font-semibold tracking-wide uppercase">
                            {t('Team')}
                        </th>
                        <th className="px-2 py-2 text-center font-semibold tracking-wide uppercase">
                            {t('P')}
                        </th>
                        <th className="px-2 py-2 text-center font-semibold tracking-wide uppercase">
                            {t('W')}
                        </th>
                        <th className="px-2 py-2 text-center font-semibold tracking-wide uppercase">
                            {t('L')}
                        </th>
                        <th className="px-2 py-2 text-center font-semibold tracking-wide uppercase">
                            {t('PF')}
                        </th>
                        <th className="px-2 py-2 text-center font-semibold tracking-wide uppercase">
                            {t('PA')}
                        </th>
                        <th className="py-2 pl-2 text-center font-semibold tracking-wide uppercase">
                            {t('Pts')}
                        </th>
                    </tr>
                </thead>
                <tbody>
                    {standings.map((row, i) => (
                        <tr
                            key={row.team_id}
                            className={`border-b border-white/10 last:border-0 ${i === 0 ? 'font-bold text-red-400' : 'text-white/80'}`}
                        >
                            <td className="py-2 pr-3">
                                {i === 0 && (
                                    <Trophy className="mr-1 inline h-3 w-3 text-amber-400" />
                                )}
                                {teamMap[row.team_id]?.name ??
                                    `Team #${row.team_id}`}
                            </td>
                            <td className="px-2 py-2 text-center tabular-nums">
                                {row.played}
                            </td>
                            <td className="px-2 py-2 text-center tabular-nums">
                                {row.won}
                            </td>
                            <td className="px-2 py-2 text-center tabular-nums">
                                {row.lost}
                            </td>
                            <td className="px-2 py-2 text-center tabular-nums">
                                {row.points_for}
                            </td>
                            <td className="px-2 py-2 text-center tabular-nums">
                                {row.points_against}
                            </td>
                            <td className="py-2 pl-2 text-center font-bold tabular-nums">
                                {row.points}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
