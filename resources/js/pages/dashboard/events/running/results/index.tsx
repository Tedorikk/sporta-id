import { Head, Link, router } from '@inertiajs/react';
import { ChevronLeft, Download, Eye, EyeOff, Medal } from 'lucide-react';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatDistance, formatDuration, formatPace } from '@/lib/format-race';
import type {
    RaceParticipant,
    RaceRankingEntry,
} from '@/types/race-participant';
import type { RunningEventCategory } from '@/types/running-event-category';
import { ImportResultsDialog } from './components/import-results-dialog';
import { ResultRow } from './components/result-row';

interface Props {
    event: { id: number; name: string; category: string | null };
    category: RunningEventCategory;
    results_published: boolean;
    participants: RaceParticipant[];
    rankings: RaceRankingEntry[];
    unranked: RaceParticipant[];
}

export default function RaceResultsIndex({
    event,
    category,
    results_published: resultsPublished,
    participants,
    rankings,
    unranked,
}: Props) {
    const [isPublishing, setIsPublishing] = useState(false);

    const baseUrl = `/dashboard/events/${event.id}/running-categories/${category.id}`;

    function togglePublication() {
        router.put(
            `/events/${event.id}/running`,
            { results_published: !resultsPublished },
            {
                preserveScroll: true,
                onStart: () => setIsPublishing(true),
                onFinish: () => setIsPublishing(false),
            },
        );
    }

    return (
        <div className="mx-auto flex h-full w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-6 md:px-8 md:py-8">
            <Head title={`Results · ${category.name}`} />

            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-4">
                    <Button
                        variant="outline"
                        size="icon"
                        className="h-10 w-10 shrink-0"
                        asChild
                    >
                        <Link
                            href={`/dashboard/events/${event.id}`}
                            aria-label="Back to event"
                        >
                            <ChevronLeft className="h-5 w-5" />
                        </Link>
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">
                            Results
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            {category.name} ·{' '}
                            {formatDistance(category.distance_meters)} ·{' '}
                            {rankings.length} finisher(s)
                        </p>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <Button variant="outline" asChild>
                        <a href={`${baseUrl}/results/export`}>
                            <Download className="mr-2 h-4 w-4" />
                            Export CSV
                        </a>
                    </Button>

                    <ImportResultsDialog
                        eventId={event.id}
                        categoryId={category.id}
                    />

                    <Button
                        variant={resultsPublished ? 'secondary' : 'default'}
                        onClick={togglePublication}
                        disabled={isPublishing}
                    >
                        {resultsPublished ? (
                            <EyeOff className="mr-2 h-4 w-4" />
                        ) : (
                            <Eye className="mr-2 h-4 w-4" />
                        )}
                        {resultsPublished ? 'Unpublish' : 'Publish results'}
                    </Button>
                </div>
            </div>

            {/* Publication covers every distance of the race at once, so it is
                worth saying out loud on a page scoped to one of them. */}
            <p className="text-xs text-muted-foreground">
                {resultsPublished
                    ? 'Results for every distance of this race are visible on the public event page.'
                    : 'Results stay private until you publish them.'}
            </p>

            <section className="flex flex-col gap-3">
                <h2 className="text-lg font-semibold tracking-tight">
                    Leaderboard
                </h2>

                <div className="divide-y rounded-lg border">
                    {rankings.length === 0 && (
                        <p className="px-4 py-8 text-center text-sm text-muted-foreground">
                            No finish times yet. Enter them below or import a
                            file from your timing provider.
                        </p>
                    )}

                    {rankings.map((entry) => (
                        <div
                            key={entry.participant_id}
                            className="flex items-center gap-3 px-3 py-2 sm:px-4"
                        >
                            <span className="w-8 text-sm font-semibold tabular-nums">
                                {entry.rank}
                            </span>
                            {entry.rank <= 3 && (
                                <Medal className="h-4 w-4 text-muted-foreground" />
                            )}
                            <Badge
                                variant="secondary"
                                className="min-w-14 justify-center font-mono"
                            >
                                {entry.bib_number ?? '—'}
                            </Badge>
                            <span className="min-w-0 flex-1 truncate text-sm">
                                {entry.name}
                            </span>
                            <span className="text-xs text-muted-foreground">
                                {formatPace(entry.pace_seconds_per_km)}
                            </span>
                            <span className="w-20 text-right text-sm font-medium tabular-nums">
                                {formatDuration(entry.duration_seconds)}
                            </span>
                        </div>
                    ))}
                </div>

                {unranked.length > 0 && (
                    <p className="text-xs text-muted-foreground">
                        Unranked:{' '}
                        {unranked
                            .map(
                                (participant) =>
                                    `${participant.bib_number ?? '—'} ${participant.name} (${participant.status.toUpperCase()})`,
                            )
                            .join(', ')}
                    </p>
                )}
            </section>

            <section className="flex flex-col gap-3">
                <h2 className="text-lg font-semibold tracking-tight">
                    Enter results
                </h2>

                <div className="divide-y rounded-lg border">
                    {participants.length === 0 && (
                        <p className="px-4 py-8 text-center text-sm text-muted-foreground">
                            Nobody on this start list yet.
                        </p>
                    )}

                    {participants.map((participant) => (
                        <ResultRow
                            key={participant.id}
                            eventId={event.id}
                            categoryId={category.id}
                            participant={participant}
                        />
                    ))}
                </div>
            </section>
        </div>
    );
}
