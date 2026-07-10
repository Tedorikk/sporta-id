import { useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import {
    ChevronLeft,
    Swords,
    Play,
    RefreshCw,
    Trophy,
    Clock,
    CheckCircle2,
    Circle,
    Edit2,
    Loader2,
    LayoutGrid,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { BasketballEventCategory } from '@/types/basketball-event-category';
import type { Event } from '@/types/event';
import type { GameMatch, MatchStatus, StandingRow } from '@/types/game-match';
import type { Pool } from '@/types/pool';
import type { Team } from '@/types/team';
import events from '@/routes/events';

// ─── Types ────────────────────────────────────────────────────────────────────

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
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<MatchStatus, string> = {
    scheduled: 'Scheduled',
    ongoing: 'Ongoing',
    completed: 'Completed',
};

const ROUND_LABELS: Record<string, string> = {
    group: 'Group Stage',
    round_of_16: 'Round of 16',
    quarterfinal: 'Quarterfinal',
    semifinal: 'Semifinal',
    final: 'Final',
};

function statusBadge(status: MatchStatus) {
    if (status === 'completed') return <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-500/25"><CheckCircle2 className="h-3 w-3 mr-1" />Completed</Badge>;
    if (status === 'ongoing') return <Badge className="bg-amber-500/15 text-amber-600 border-amber-500/25"><Play className="h-3 w-3 mr-1" />Ongoing</Badge>;
    return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />Scheduled</Badge>;
}

// ─── ScoreDialog ──────────────────────────────────────────────────────────────

function ScoreDialog({
    event,
    category,
    match,
}: {
    event: Event;
    category: BasketballEventCategory;
    match: GameMatch;
}) {
    const [open, setOpen] = useState(false);
    const [homeScore, setHomeScore] = useState(String(match.home_score ?? 0));
    const [awayScore, setAwayScore] = useState(String(match.away_score ?? 0));
    const [status, setStatus] = useState<MatchStatus>(match.status);
    const [saving, setSaving] = useState(false);

    const handleSave = () => {
        setSaving(true);
        router.patch(
            `/dashboard/events/${event.id}/basketball-categories/${category.id}/matches/${match.id}/score`,
            { home_score: Number(homeScore), away_score: Number(awayScore), status },
            {
                preserveScroll: true,
                onSuccess: () => setOpen(false),
                onFinish: () => setSaving(false),
            },
        );
    };

    const homeName = match.homeTeam?.name ?? 'TBD';
    const awayName = match.awayTeam?.name ?? 'TBD';

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="ghost" size="sm" className="h-7 px-2 text-xs gap-1">
                    <Edit2 className="h-3 w-3" />
                    Score
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-sm">
                <DialogHeader>
                    <DialogTitle>Update Score</DialogTitle>
                    <DialogDescription>
                        {homeName} vs {awayName}
                    </DialogDescription>
                </DialogHeader>

                <div className="grid grid-cols-3 items-center gap-3">
                    <div className="flex flex-col items-center gap-1">
                        <span className="text-xs font-medium text-muted-foreground truncate max-w-full">{homeName}</span>
                        <Input
                            id="home-score"
                            type="number"
                            min={0}
                            value={homeScore}
                            onChange={(e) => setHomeScore(e.target.value)}
                            className="text-center text-xl font-bold h-14"
                        />
                    </div>
                    <div className="flex items-center justify-center text-muted-foreground font-bold text-lg pt-5">vs</div>
                    <div className="flex flex-col items-center gap-1">
                        <span className="text-xs font-medium text-muted-foreground truncate max-w-full">{awayName}</span>
                        <Input
                            id="away-score"
                            type="number"
                            min={0}
                            value={awayScore}
                            onChange={(e) => setAwayScore(e.target.value)}
                            className="text-center text-xl font-bold h-14"
                        />
                    </div>
                </div>

                <div className="flex flex-col gap-1.5">
                    <Label htmlFor="match-status">Status</Label>
                    <Select value={status} onValueChange={(v) => setStatus(v as MatchStatus)}>
                        <SelectTrigger id="match-status">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="scheduled">Scheduled</SelectItem>
                            <SelectItem value="ongoing">Ongoing</SelectItem>
                            <SelectItem value="completed">Completed</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                    <Button onClick={handleSave} disabled={saving}>
                        {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                        Save Score
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

// ─── MatchCard ────────────────────────────────────────────────────────────────

function MatchCard({
    event,
    category,
    match,
}: {
    event: Event;
    category: BasketballEventCategory;
    match: GameMatch;
}) {
    const homeName = match.homeTeam?.name ?? 'TBD';
    const awayName = match.awayTeam?.name ?? 'TBD';
    const isCompleted = match.status === 'completed';

    const homeWon = isCompleted && match.home_score !== null && match.away_score !== null
        && match.home_score > match.away_score;
    const awayWon = isCompleted && match.home_score !== null && match.away_score !== null
        && match.away_score > match.home_score;

    return (
        <div className="flex items-center gap-3 rounded-lg border bg-card px-4 py-3 shadow-sm">
            {/* Match number */}
            {match.match_number && (
                <span className="text-xs text-muted-foreground w-5 shrink-0">#{match.match_number}</span>
            )}

            {/* Teams & Score */}
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

            {/* Status & Actions */}
            <div className="flex items-center gap-2 shrink-0">
                {statusBadge(match.status)}
                <ScoreDialog event={event} category={category} match={match} />
            </div>
        </div>
    );
}

// ─── StandingsTable ───────────────────────────────────────────────────────────

function StandingsTable({
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

// ─── GenerateButton ───────────────────────────────────────────────────────────

function GenerateAllButton({ event, category, hasMatches }: { event: Event; category: BasketballEventCategory; hasMatches: boolean }) {
    const [generating, setGenerating] = useState(false);

    const handleGenerate = () => {
        if (!confirm(hasMatches
            ? 'This will delete all existing matches and regenerate. Continue?'
            : 'Generate schedule for all teams in this category?')) return;

        setGenerating(true);
        router.post(
            `/dashboard/events/${event.id}/basketball-categories/${category.id}/matches/generate`,
            {},
            {
                preserveScroll: true,
                onFinish: () => setGenerating(false),
            },
        );
    };

    return (
        <Button size="sm" variant={hasMatches ? 'outline' : 'default'} onClick={handleGenerate} disabled={generating}>
            {generating
                ? <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                : <RefreshCw className="h-4 w-4 mr-2" />
            }
            {hasMatches ? 'Regenerate' : 'Generate Schedule'}
        </Button>
    );
}

function GeneratePoolButton({ event, category, pool, hasMatches }: { event: Event; category: BasketballEventCategory; pool: Pool; hasMatches: boolean }) {
    const [generating, setGenerating] = useState(false);

    const handleGenerate = () => {
        if (!confirm(hasMatches
            ? `Regenerate matches for ${pool.name}? Existing matches will be deleted.`
            : `Generate schedule for ${pool.name}?`)) return;

        setGenerating(true);
        router.post(
            `/dashboard/events/${event.id}/basketball-categories/${category.id}/pools/${pool.id}/generate`,
            {},
            {
                preserveScroll: true,
                onFinish: () => setGenerating(false),
            },
        );
    };

    return (
        <Button size="sm" variant="outline" onClick={handleGenerate} disabled={generating} className="h-7 text-xs">
            {generating
                ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                : <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
            }
            Generate
        </Button>
    );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function MatchesIndex({ event, category, pools, groupMatches, bracketMatches, standings }: Props) {
    const allTeams = pools.flatMap((p) => p.teams ?? []);
    const allGroupMatches = Object.values(groupMatches).flat();
    const allBracketMatches = Object.values(bracketMatches).flat();
    const totalMatches = allGroupMatches.length + allBracketMatches.length;
    const isRoundRobin = category.format === 'round_robin';

    console.log(groupMatches)

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
                        {/* Bracket link (pool_stage only) */}
                        {!isRoundRobin && (
                            <Button variant="outline" size="sm" asChild>
                                <Link href={`/dashboard/events/${event.id}/basketball-categories/${category.id}/bracket`}>
                                    <LayoutGrid className="h-4 w-4 mr-2" />
                                    Bracket
                                </Link>
                            </Button>
                        )}
                        {isRoundRobin && (
                            <GenerateAllButton
                                event={event}
                                category={category}
                                hasMatches={allGroupMatches.length > 0}
                            />
                        )}
                    </div>
                </div>

                {/* Stats bar */}
                <div className="grid grid-cols-3 gap-3">
                    {[
                        { label: 'Total', value: totalMatches, icon: <Swords className="h-4 w-4" /> },
                        { label: 'Completed', value: [...allGroupMatches, ...allBracketMatches].filter(m => m.status === 'completed').length, icon: <CheckCircle2 className="h-4 w-4 text-emerald-500" /> },
                        { label: 'Remaining', value: [...allGroupMatches, ...allBracketMatches].filter(m => m.status !== 'completed').length, icon: <Circle className="h-4 w-4 text-muted-foreground" /> },
                    ].map(({ label, value, icon }) => (
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
                    const pMatches: GameMatch[] = groupMatches[pool.id] ?? [];
                    const pStandings: StandingRow[] = standings[pool.id] ?? [];

                    return (
                        <section key={pool.id} className="flex flex-col gap-4 rounded-xl border bg-card p-5 shadow-sm">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <LayoutGrid className="h-4 w-4 text-primary" />
                                    <h2 className="font-semibold">{pool.name}</h2>
                                    <Badge variant="secondary">{pMatches.length} matches</Badge>
                                </div>
                                <GeneratePoolButton
                                    event={event}
                                    category={category}
                                    pool={pool}
                                    hasMatches={pMatches.length > 0}
                                />
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
                                {(rMatches as GameMatch[]).map((m) => (
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
