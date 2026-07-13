import { Trophy } from 'lucide-react';
import type { StandingRow } from '@/types/game-match';
import type { Team } from '@/types/team';

export function StandingsTable({
    standings,
    teams,
}: {
    standings: StandingRow[];
    teams: Team[];
}) {
    const teamMap = Object.fromEntries(teams.map((t) => [t.id, t]));

    return (
        <div className="overflow-x-auto">
            <table className="w-full text-xs">
                <thead>
                    <tr className="border-b">
                        <th className="pb-2 pr-3 text-left font-medium text-muted-foreground">Team</th>
                        <th className="pb-2 px-2 text-center font-medium text-muted-foreground">P</th>
                        <th className="pb-2 px-2 text-center font-medium text-muted-foreground">W</th>
                        <th className="pb-2 px-2 text-center font-medium text-muted-foreground">L</th>
                        <th className="pb-2 px-2 text-center font-medium text-muted-foreground">PF</th>
                        <th className="pb-2 px-2 text-center font-medium text-muted-foreground">PA</th>
                        <th className="pb-2 pl-2 text-center font-medium text-muted-foreground">Pts</th>
                    </tr>
                </thead>
                <tbody>
                    {standings.map((row, i) => (
                        <tr key={row.team_id} className={`border-b last:border-0 ${i === 0 ? 'text-primary font-semibold' : ''}`}>
                            <td className="py-2 pr-3">
                                {i === 0 && <Trophy className="inline h-3 w-3 mr-1 text-amber-500" />}
                                {teamMap[row.team_id]?.name ?? `Team #${row.team_id}`}
                            </td>
                            <td className="py-2 px-2 text-center tabular-nums">{row.played}</td>
                            <td className="py-2 px-2 text-center tabular-nums">{row.won}</td>
                            <td className="py-2 px-2 text-center tabular-nums">{row.lost}</td>
                            <td className="py-2 px-2 text-center tabular-nums">{row.points_for}</td>
                            <td className="py-2 px-2 text-center tabular-nums">{row.points_against}</td>
                            <td className="py-2 pl-2 text-center tabular-nums font-bold">{row.points}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}