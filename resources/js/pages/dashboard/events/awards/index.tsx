import { Head, Link } from '@inertiajs/react';
import { ChevronLeft, Plus, Trophy } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatRupiah } from '@/lib/format-currency';
import type { Award, AwardStatus } from '@/types/award';
import type { Event } from '@/types/event';
import { AwardFormDialog } from './components/award-form-dialog';

interface Props {
    event: Event;
    awards: Award[];
}

const STATUS_VARIANT: Record<AwardStatus, 'default' | 'secondary' | 'outline'> =
    {
        open: 'default',
        draft: 'secondary',
        closed: 'outline',
    };

export default function AwardsIndex({ event, awards }: Props) {
    return (
        <div className="mx-auto flex h-full w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-6 md:px-8 md:py-8">
            <Head title={`Awards · ${event.name}`} />

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
                            Awards &amp; Voting
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            {event.name} · Let people vote for a player or team.
                        </p>
                    </div>
                </div>

                <AwardFormDialog
                    event={event}
                    trigger={
                        <Button>
                            <Plus className="mr-2 h-4 w-4" />
                            New Award
                        </Button>
                    }
                />
            </div>

            <div className="divide-y rounded-lg border">
                {awards.length === 0 && (
                    <div className="flex flex-col items-center gap-2 px-4 py-12 text-center">
                        <Trophy className="h-8 w-8 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">
                            No awards yet. Create one to open voting for this
                            event.
                        </p>
                    </div>
                )}

                {awards.map((award) => (
                    <Link
                        key={award.id}
                        href={`/dashboard/events/${event.id}/awards/${award.id}`}
                        className="flex flex-col gap-2 px-3 py-3 transition-colors hover:bg-muted/50 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-4"
                    >
                        <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                                <p className="truncate text-sm font-medium">
                                    {award.title}
                                </p>
                                <Badge variant={STATUS_VARIANT[award.status]}>
                                    {award.status}
                                </Badge>
                                {award.is_paid && (
                                    <Badge variant="outline">
                                        {formatRupiah(award.price_per_vote)} /
                                        vote
                                    </Badge>
                                )}
                            </div>
                            <p className="mt-1 text-xs text-muted-foreground">
                                {award.nominees_count ?? 0}{' '}
                                {award.nominee_kind === 'player'
                                    ? 'player'
                                    : 'team'}
                                {(award.nominees_count ?? 0) === 1 ? '' : 's'}{' '}
                                on the ballot
                            </p>
                        </div>

                        <div className="shrink-0 text-right">
                            <p className="text-sm font-semibold">
                                {award.votes_total ?? 0}
                            </p>
                            <p className="text-xs text-muted-foreground">
                                {award.is_paid
                                    ? formatRupiah(award.revenue_total ?? 0)
                                    : 'votes'}
                            </p>
                        </div>
                    </Link>
                ))}
            </div>
        </div>
    );
}
