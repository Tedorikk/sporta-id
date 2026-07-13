import { Head, Link } from '@inertiajs/react';
import { CheckCircle2, ChevronLeft, Circle, LayoutGrid, Swords } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import events from '@/routes/events';
import type { BasketballEventCategory } from '@/types/basketball-event-category';
import type { Event } from '@/types/event';
import type { GameMatch, StandingRow } from '@/types/game-match';
import type { Pool } from '@/types/pool';
import type { Team } from '@/types/team';
import { ROUND_LABELS } from './components/constants';
import { CreateMatchDialog } from './components/create-match-dialog';
import { DeleteAllMatchesButton } from './components/delete-all-matches-button';
import { GenerateAllButton } from './components/generate-all-button';
import { GeneratePoolButton } from './components/generate-pool-button';
import { MatchCard } from './components/match-card';
import { StandingsTable } from './components/standings-table';

interface Props {
    event: Event;
    category: BasketballEventCategory;
    pools: Pool[];
    /** key = pool_id | 'ungrouped', value = array of matches */
    groupMatches: Record<string, GameMatch[]>;
    /** key = round name, value = array of matches */
    bracketMatches: Record<string, GameMatch[]>;
    /** key = pool_id, value = standings array */
    standings: Record<string, StandingRow[]>;
    teams: Team[];
}

export default function MatchesIndex({ event, category, pools, groupMatches, bracketMatches, standings, teams }: Props) {
    const allTeams = pools.flatMap((p) => p.teams ?? []);
    const allGroupMatches = Object.values(groupMatches).flat();
    const allBracketMatches = Object.values(bracketMatches).flat();
    const allMatches = [...allGroupMatches, ...allBracketMatches];
    const totalMatches = allMatches.length;
    const isRoundRobin = category.format === 'round_robin';

    const stats = [
        { label: 'Total', value: totalMatches, icon: <Swords className="h-4 w-4" /> },
        { label: 'Completed', value: allMatches.filter((m) => m.status === 'finished').length, icon: <CheckCircle2 className="h-4 w-4 text-emerald-500" /> },
        { label: 'Remaining', value: allMatches.filter((m) => m.status !== 'finished').length, icon: <Circle className="h-4 w-4 text-muted-foreground" /> },
    ];

    return (
        <>
            <Head title={`Matches — ${category.name}`} />

            <div className="mx-auto flex h-full w-full max-w-5xl flex-col gap-6 px-4 py-6 md:px-8 md:py-8">
                {/* Header */}
                <div className="flex items-start gap-4">
                    <Button variant="outline" size="icon" className="mt-1 h-9 w-9 shrink-0" asChild>
                        <Link href={`/dashboard/events/${event.id}`}>
                            <ChevronLeft className="h-4 w-4" />
                        </Link>
                    </Button>
                    <div className="flex-1 min-w-0">
                        <h1 className="text-2xl font-bold tracking-tight">Matches</h1>
                        <p className="text-sm text-muted-foreground mt-0.5">
                            {event.name} &middot; {category.name}
                        </p>
                    </div>

                    <div className="flex items-center gap-2">
                        {!isRoundRobin && (
                            <Button variant="outline" size="sm" asChild>
                                <Link href={`/dashboard/events/${event.id}/basketball-categories/${category.id}/bracket`}>
                                    <LayoutGrid className="h-4 w-4 mr-2" />
                                    Bracket
                                </Link>
                            </Button>
                        )}

                        {isRoundRobin && (
                            <GenerateAllButton event={event} category={category} hasMatches={allGroupMatches.length > 0} />
                        )}

                        <DeleteAllMatchesButton event={event} category={category} hasMatches={totalMatches > 0} />

                        <CreateMatchDialog event={event} category={category} pools={pools} teams={teams} />
                    </div>
                </div>

                {/* Stats bar */}
                <div className="grid grid-cols-3 gap-3">
                    {stats.map(({ label, value, icon }) => (
                        <div key={label} className="rounded-lg border bg-card px-4 py-3 shadow-sm flex items-center gap-3">
                            <div className="rounded-md bg-muted p-2 text-muted-foreground">{icon}</div>
                            <div>
                                <p className="text-xl font-bold">{value}</p>
                                <p className="text-xs text-muted-foreground">{label}</p>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Round Robin — group matches flat */}
                {isRoundRobin && (
                    <section className="flex flex-col gap-3 rounded-xl border bg-card p-5 shadow-sm">
                        <div className="flex items-center justify-between">
                            <h2 className="font-semibold">Group Stage Matches</h2>
                            <Badge variant="secondary">{allGroupMatches.length} matches</Badge>
                        </div>
                        {allGroupMatches.length === 0 ? (
                            <div className="py-10 text-center border border-dashed rounded-lg text-muted-foreground text-sm">
                                No matches yet. Generate the schedule above.
                            </div>
                        ) : (
                            <div className="flex flex-col gap-2">
                                {allGroupMatches.map((m) => (
                                    <MatchCard key={m.id} event={event} category={category} match={m} />
                                ))}
                            </div>
                        )}
                    </section>
                )}

                {/* Pool Stage — matches per pool + standings */}
                {!isRoundRobin && pools.map((pool) => {
                    const pMatches: GameMatch[] = groupMatches[String(pool.id)] ?? [];
                    const pStandings: StandingRow[] = standings[pool.id] ?? [];

                    return (
                        <section key={pool.id} className="flex flex-col gap-4 rounded-xl border bg-card p-5 shadow-sm">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <LayoutGrid className="h-4 w-4 text-primary" />
                                    <h2 className="font-semibold">{pool.name}</h2>
                                    <Badge variant="secondary">{pMatches.length} matches</Badge>
                                </div>
                                <div className="flex gap-2">
                                    <GeneratePoolButton event={event} category={category} pool={pool} hasMatches={pMatches.length > 0} />
                                    <CreateMatchDialog event={event} category={category} pools={pools} teams={teams} defaultPool={pool} />
                                </div>
                            </div>

                            {pMatches.length === 0 ? (
                                <p className="text-sm text-muted-foreground py-4 text-center border border-dashed rounded-lg">
                                    No matches yet. Click Generate to create the schedule for this pool.
                                </p>
                            ) : (
                                <div className="flex flex-col gap-2">
                                    {pMatches.map((m) => (
                                        <MatchCard key={m.id} event={event} category={category} match={m} />
                                    ))}
                                </div>
                            )}

                            {pStandings.length > 0 && (
                                <div className="border-t pt-3">
                                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Standings</p>
                                    <StandingsTable standings={pStandings} teams={allTeams} />
                                </div>
                            )}
                        </section>
                    );
                })}

                {/* Bracket rounds (knockout) */}
                {Object.keys(bracketMatches).length > 0 && (
                    <section className="flex flex-col gap-4 rounded-xl border bg-card p-5 shadow-sm">
                        <div className="flex items-center justify-between">
                            <h2 className="font-semibold">Knockout Stage</h2>
                            <Button size="sm" variant="outline" asChild>
                                <Link href={`/dashboard/events/${event.id}/basketball-categories/${category.id}/bracket`}>
                                    View Bracket →
                                </Link>
                            </Button>
                        </div>
                        {Object.entries(bracketMatches).map(([round, rMatches]) => (
                            <div key={round} className="flex flex-col gap-2">
                                <h3 className="text-sm font-medium text-muted-foreground">
                                    {ROUND_LABELS[round] ?? round}
                                </h3>
                                {rMatches.map((m) => (
                                    <MatchCard key={m.id} event={event} category={category} match={m} />
                                ))}
                            </div>
                        ))}
                    </section>
                )}

                {totalMatches === 0 && !isRoundRobin && pools.length === 0 && (
                    <div className="py-16 text-center border border-dashed rounded-xl text-muted-foreground">
                        <Swords className="mx-auto h-8 w-8 mb-3 opacity-40" />
                        <p className="text-sm font-medium">No pools or matches yet</p>
                        <p className="text-sm mt-1">Create pools and assign teams first, then generate matches.</p>
                    </div>
                )}
            </div>
        </>
    );
}

MatchesIndex.layout = {
    breadcrumbs: [
        { title: 'Events', href: events.index() },
        { title: 'Event', href: '#' },
        { title: 'Matches', href: '#' },
    ],
};