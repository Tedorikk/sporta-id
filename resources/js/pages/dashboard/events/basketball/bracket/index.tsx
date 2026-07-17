import { Head, Link, router } from '@inertiajs/react';
import {
    ChevronLeft,
    Trophy,
    LayoutGrid,
    RefreshCw,
    Loader2,
    CheckCircle2,
    Circle,
    Play,
} from 'lucide-react';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import events from '@/routes/events';
import type { BasketballEventCategory } from '@/types/basketball-event-category';
import type { Event } from '@/types/event';
import type { GameMatch, MatchStatus } from '@/types/game-match';

// ─── Types ─────────────────────────────────────────────────────────────────

interface Props {
    event: Event;
    category: BasketballEventCategory;
    /** key = round name, value = matches in that round */
    bracket: Record<string, GameMatch[]>;
}

// ─── Constants ──────────────────────────────────────────────────────────────

const ROUND_ORDER = ['round_of_16', 'quarterfinal', 'semifinal', 'final'];

const ROUND_LABELS: Record<string, string> = {
    round_of_16: 'Round of 16',
    quarterfinal: 'Quarterfinal',
    semifinal: 'Semifinal',
    final: 'Final',
};

// ─── MatchSlot ───────────────────────────────────────────────────────────────

function MatchSlot({ match }: { match: GameMatch }) {
    const homeName = match.homeTeam?.name ?? 'TBD';
    const awayName = match.awayTeam?.name ?? 'TBD';
    const isCompleted = match.status === 'finished';

    const homeWon = isCompleted && match.home_score !== null && match.away_score !== null
        && match.home_score > match.away_score;
    const awayWon = isCompleted && match.home_score !== null && match.away_score !== null
        && match.away_score > match.home_score;

    return (
        <div className="flex flex-col gap-0 rounded-lg border overflow-hidden shadow-sm min-w-[180px]">
            {/* Home team */}
            <div className={`flex items-center justify-between gap-2 px-3 py-2 border-b ${homeWon ? 'bg-primary/10' : 'bg-card'}`}>
                <span className={`text-sm truncate ${homeWon ? 'font-semibold text-primary' : match.homeTeam ? '' : 'text-muted-foreground italic'}`}>
                    {match.homeTeam ? homeName : 'TBD'}
                </span>
                <span className={`text-sm font-bold tabular-nums min-w-[1.5rem] text-right ${homeWon ? 'text-primary' : 'text-muted-foreground'}`}>
                    {isCompleted && match.home_score !== null ? match.home_score : '—'}
                </span>
            </div>
            {/* Away team */}
            <div className={`flex items-center justify-between gap-2 px-3 py-2 ${awayWon ? 'bg-primary/10' : 'bg-card'}`}>
                <span className={`text-sm truncate ${awayWon ? 'font-semibold text-primary' : match.awayTeam ? '' : 'text-muted-foreground italic'}`}>
                    {match.awayTeam ? awayName : 'TBD'}
                </span>
                <span className={`text-sm font-bold tabular-nums min-w-[1.5rem] text-right ${awayWon ? 'text-primary' : 'text-muted-foreground'}`}>
                    {isCompleted && match.away_score !== null ? match.away_score : '—'}
                </span>
            </div>

            {/* Status indicator */}
            <div className="flex items-center justify-between px-3 py-1 bg-muted/40 text-xs text-muted-foreground border-t">
                <span>
                    {match.match_number ? `#${match.match_number}` : ''}
                </span>
                {match.status === 'finished' && (
                    <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                )}
                {match.status === 'ongoing' && (
                    <Play className="h-3 w-3 text-amber-500" />
                )}
                {match.status === 'scheduled' && (
                    <Circle className="h-3 w-3 text-muted-foreground/50" />
                )}
            </div>
        </div>
    );
}

// ─── BracketRound ────────────────────────────────────────────────────────────

function BracketRound({
    label,
    matches,
    isFinal,
}: {
    label: string;
    matches: GameMatch[];
    isFinal: boolean;
}) {
    return (
        <div className="flex flex-col gap-2 min-w-[200px]">
            <div className={`text-center text-xs font-semibold uppercase tracking-wider px-2 py-1 rounded-md ${isFinal ? 'bg-amber-500/15 text-amber-600' : 'bg-muted text-muted-foreground'
                }`}>
                {isFinal && <Trophy className="inline h-3 w-3 mr-1" />}
                {label}
            </div>
            <div className="flex flex-col justify-around h-full gap-4">
                {matches.map((m) => (
                    <MatchSlot key={m.id} match={m} />
                ))}
            </div>
        </div>
    );
}

// ─── GenerateBracketSection ───────────────────────────────────────────────────

function GenerateBracketSection({
    event,
    category,
    hasBracket,
}: {
    event: Event;
    category: BasketballEventCategory;
    hasBracket: boolean;
}) {
    const [advancePerPool, setAdvancePerPool] = useState('2');
    const [generating, setGenerating] = useState(false);

    const handleGenerate = () => {
        if (!confirm(hasBracket
            ? 'This will delete the existing bracket and regenerate. Continue?'
            : 'Generate the knockout bracket?')) {
return;
}

        setGenerating(true);
        router.post(
            `/dashboard/events/${event.id}/basketball-categories/${category.id}/bracket/generate`,
            { advance_per_pool: Number(advancePerPool) },
            {
                preserveScroll: true,
                onFinish: () => setGenerating(false),
            },
        );
    };

    return (
        <div className="flex items-end gap-3">
            <div className="flex flex-col gap-1">
                <Label htmlFor="advance-per-pool" className="text-xs">Advance per pool</Label>
                <Input
                    id="advance-per-pool"
                    type="number"
                    min={1}
                    max={4}
                    value={advancePerPool}
                    onChange={(e) => setAdvancePerPool(e.target.value)}
                    className="h-8 w-20 text-sm"
                />
            </div>
            <Button size="sm" variant={hasBracket ? 'outline' : 'default'} onClick={handleGenerate} disabled={generating}>
                {generating
                    ? <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    : <RefreshCw className="h-4 w-4 mr-2" />
                }
                {hasBracket ? 'Regenerate Bracket' : 'Generate Bracket'}
            </Button>
        </div>
    );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function BracketIndex({ event, category, bracket }: Props) {
    const hasBracket = Object.keys(bracket).length > 0;

    // Sort rounds in the correct bracket order
    const sortedRounds = Object.keys(bracket).sort((a, b) => {
        const ai = ROUND_ORDER.indexOf(a);
        const bi = ROUND_ORDER.indexOf(b);

        if (ai === -1 && bi === -1) {
return a.localeCompare(b);
}

        if (ai === -1) {
return 1;
}

        if (bi === -1) {
return -1;
}

        return ai - bi;
    });

    return (
        <>
            <Head title={`Bracket — ${category.name}`} />

            <div className="mx-auto flex h-full w-full max-w-7xl flex-col gap-6 px-4 py-6 md:px-8 md:py-8">
                {/* Header */}
                <div className="flex items-start gap-4">
                    <Button variant="outline" size="icon" className="mt-1 h-9 w-9 shrink-0" asChild>
                        <Link href={`/dashboard/events/${event.id}/basketball-categories/${category.id}/matches`}>
                            <ChevronLeft className="h-4 w-4" />
                        </Link>
                    </Button>
                    <div className="flex-1 min-w-0">
                        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                            <Trophy className="h-6 w-6 text-amber-500" />
                            Bracket
                        </h1>
                        <p className="text-sm text-muted-foreground mt-0.5">
                            {event.name} &middot; {category.name}
                        </p>
                    </div>

                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" asChild>
                            <Link href={`/dashboard/events/${event.id}/basketball-categories/${category.id}/matches`}>
                                <LayoutGrid className="h-4 w-4 mr-2" />
                                Matches
                            </Link>
                        </Button>
                    </div>
                </div>

                {/* Generate controls */}
                <div className="flex items-center justify-between gap-4 rounded-xl border bg-card p-4 shadow-sm">
                    <div>
                        <p className="text-sm font-medium">Knockout Bracket</p>
                        <p className="text-xs text-muted-foreground">
                            {hasBracket
                                ? `${Object.values(bracket).flat().length} matches across ${sortedRounds.length} rounds`
                                : 'No bracket generated yet. Complete all pool matches first, then generate the bracket.'}
                        </p>
                    </div>
                    <GenerateBracketSection
                        event={event}
                        category={category}
                        hasBracket={hasBracket}
                    />
                </div>

                {/* Bracket visualization */}
                {hasBracket ? (
                    <div className="rounded-xl border bg-card p-6 shadow-sm overflow-x-auto">
                        <div className="flex items-start gap-8 min-w-max">
                            {sortedRounds.map((round) => (
                                <BracketRound
                                    key={round}
                                    label={ROUND_LABELS[round] ?? round}
                                    matches={bracket[round] as GameMatch[]}
                                    isFinal={round === 'final'}
                                />
                            ))}
                        </div>
                    </div>
                ) : (
                    <div className="py-20 text-center border border-dashed rounded-xl text-muted-foreground">
                        <Trophy className="mx-auto h-10 w-10 mb-3 opacity-30" />
                        <p className="text-sm font-medium">No bracket yet</p>
                        <p className="text-sm mt-1 max-w-sm mx-auto">
                            All pool stage matches must be completed before the knockout bracket can be generated.
                        </p>
                    </div>
                )}
            </div>
        </>
    );
}

BracketIndex.layout = {
    breadcrumbs: [
        { title: 'Events', href: events.index() },
        { title: 'Event', href: '#' },
        { title: 'Bracket', href: '#' },
    ],
};
