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
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import events from '@/routes/events';
import type { BasketballEventCategory } from '@/types/basketball-event-category';
import type { Event } from '@/types/event';
import type { GameMatch } from '@/types/game-match';

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
    const homeName = match.home_team?.name ?? 'TBD';
    const awayName = match.away_team?.name ?? 'TBD';
    const isCompleted = match.status === 'finished';

    const homeWon =
        isCompleted &&
        match.home_score !== null &&
        match.away_score !== null &&
        match.home_score > match.away_score;
    const awayWon =
        isCompleted &&
        match.home_score !== null &&
        match.away_score !== null &&
        match.away_score > match.home_score;

    return (
        <div className="flex min-w-[180px] flex-col gap-0 overflow-hidden rounded-lg border shadow-sm">
            {/* Home team */}
            <div
                className={`flex items-center justify-between gap-2 border-b px-3 py-2 ${homeWon ? 'bg-primary/10' : 'bg-card'}`}
            >
                <span
                    className={`truncate text-sm ${homeWon ? 'font-semibold text-primary' : match.home_team ? '' : 'text-muted-foreground italic'}`}
                >
                    {match.home_team ? homeName : 'TBD'}
                </span>
                <span
                    className={`min-w-[1.5rem] text-right text-sm font-bold tabular-nums ${homeWon ? 'text-primary' : 'text-muted-foreground'}`}
                >
                    {isCompleted && match.home_score !== null
                        ? match.home_score
                        : '—'}
                </span>
            </div>
            {/* Away team */}
            <div
                className={`flex items-center justify-between gap-2 px-3 py-2 ${awayWon ? 'bg-primary/10' : 'bg-card'}`}
            >
                <span
                    className={`truncate text-sm ${awayWon ? 'font-semibold text-primary' : match.away_team ? '' : 'text-muted-foreground italic'}`}
                >
                    {match.away_team ? awayName : 'TBD'}
                </span>
                <span
                    className={`min-w-[1.5rem] text-right text-sm font-bold tabular-nums ${awayWon ? 'text-primary' : 'text-muted-foreground'}`}
                >
                    {isCompleted && match.away_score !== null
                        ? match.away_score
                        : '—'}
                </span>
            </div>

            {/* Status indicator */}
            <div className="flex items-center justify-between border-t bg-muted/40 px-3 py-1 text-xs text-muted-foreground">
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
        <div className="flex min-w-[200px] flex-col gap-2">
            <div
                className={`rounded-md px-2 py-1 text-center text-xs font-semibold tracking-wider uppercase ${
                    isFinal
                        ? 'bg-amber-500/15 text-amber-600'
                        : 'bg-muted text-muted-foreground'
                }`}
            >
                {isFinal && <Trophy className="mr-1 inline h-3 w-3" />}
                {label}
            </div>
            <div className="flex h-full flex-col justify-around gap-4">
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
        if (
            !confirm(
                hasBracket
                    ? 'This will delete the existing bracket and regenerate. Continue?'
                    : 'Generate the knockout bracket?',
            )
        ) {
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
                <Label htmlFor="advance-per-pool" className="text-xs">
                    Advance per pool
                </Label>
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
            <Button
                size="sm"
                variant={hasBracket ? 'outline' : 'default'}
                onClick={handleGenerate}
                disabled={generating}
            >
                {generating ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                    <RefreshCw className="mr-2 h-4 w-4" />
                )}
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
                    <Button
                        variant="outline"
                        size="icon"
                        className="mt-1 h-9 w-9 shrink-0"
                        asChild
                    >
                        <Link
                            href={`/dashboard/events/${event.id}/basketball-categories/${category.id}/matches`}
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </Link>
                    </Button>
                    <div className="min-w-0 flex-1">
                        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
                            <Trophy className="h-6 w-6 text-amber-500" />
                            Bracket
                        </h1>
                        <p className="mt-0.5 text-sm text-muted-foreground">
                            {event.name} &middot; {category.name}
                        </p>
                    </div>

                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" asChild>
                            <Link
                                href={`/dashboard/events/${event.id}/basketball-categories/${category.id}/matches`}
                            >
                                <LayoutGrid className="mr-2 h-4 w-4" />
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
                    <div className="overflow-x-auto rounded-xl border bg-card p-6 shadow-sm">
                        <div className="flex min-w-max items-start gap-8">
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
                    <div className="rounded-xl border border-dashed py-20 text-center text-muted-foreground">
                        <Trophy className="mx-auto mb-3 h-10 w-10 opacity-30" />
                        <p className="text-sm font-medium">No bracket yet</p>
                        <p className="mx-auto mt-1 max-w-sm text-sm">
                            All pool stage matches must be completed before the
                            knockout bracket can be generated.
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
