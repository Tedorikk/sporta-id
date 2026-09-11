import { formatDistance, formatDuration, formatPace } from '@/lib/format-race';
import type { RaceRankingEntry } from '@/types/race-participant';

export interface PublicRaceResult {
    id: number;
    name: string;
    distance_meters: number;
    rankings: RaceRankingEntry[];
    unranked: {
        id: number;
        bib_number: string | null;
        name: string;
        status: string;
    }[];
}

/** The finishers of one distance, as published on the public event page. */
export function RaceResultsSection({ result }: { result: PublicRaceResult }) {
    return (
        <div className="flex flex-col gap-4 rounded-2xl border-2 border-white/15 bg-white/5 p-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-xl font-black tracking-tight uppercase">
                    {result.name}
                </h3>
                <div className="flex flex-wrap gap-3 text-xs text-white/60">
                    <span>{formatDistance(result.distance_meters)}</span>
                    <span>{result.rankings.length} finishers</span>
                </div>
            </div>

            {result.rankings.length === 0 ? (
                <p className="text-sm text-white/40">
                    No finish times for this distance.
                </p>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead>
                            <tr className="text-xs tracking-wide text-white/50 uppercase">
                                <th className="py-2 pr-3">#</th>
                                <th className="py-2 pr-3">Bib</th>
                                <th className="py-2 pr-3">Name</th>
                                <th className="py-2 pr-3 text-right">Pace</th>
                                <th className="py-2 text-right">Time</th>
                            </tr>
                        </thead>
                        <tbody>
                            {result.rankings.map((entry) => (
                                <tr
                                    key={entry.participant_id}
                                    className="border-t border-white/10"
                                >
                                    <td className="py-2 pr-3 font-bold tabular-nums">
                                        {entry.rank}
                                    </td>
                                    <td className="py-2 pr-3 font-mono text-white/60">
                                        {entry.bib_number ?? '—'}
                                    </td>
                                    <td className="py-2 pr-3">{entry.name}</td>
                                    <td className="py-2 pr-3 text-right text-white/60">
                                        {formatPace(entry.pace_seconds_per_km)}
                                    </td>
                                    <td className="py-2 text-right font-bold tabular-nums">
                                        {formatDuration(entry.duration_seconds)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {result.unranked.length > 0 && (
                <p className="text-xs text-white/40">
                    {result.unranked
                        .map(
                            (participant) =>
                                `${participant.bib_number ?? '—'} ${participant.name} (${participant.status.toUpperCase()})`,
                        )
                        .join(' · ')}
                </p>
            )}
        </div>
    );
}
