import { Head, Link, router } from '@inertiajs/react';
import { ChevronLeft, Link2, Pencil, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { formatRupiah } from '@/lib/format-currency';
import { formatImageUrl } from '@/lib/image-utils';
import type {
    Award,
    AwardCandidate,
    AwardNominee,
    AwardStats,
} from '@/types/award';
import type { Event } from '@/types/event';
import { AwardFormDialog } from './components/award-form-dialog';

interface Props {
    event: Event;
    award: Award;
    nominees: AwardNominee[];
    candidates: AwardCandidate[];
    stats: AwardStats;
}

export default function AwardShow({
    event,
    award,
    nominees,
    candidates,
    stats,
}: Props) {
    const [selectedCandidate, setSelectedCandidate] = useState('');

    const votingLocked = stats.ballots_counted > 0;

    // Nominees arrive in ballot order; results read best ranked by score.
    const ranked = [...nominees].sort(
        (a, b) => (b.votes_total ?? 0) - (a.votes_total ?? 0),
    );
    const leader = ranked[0]?.votes_total ?? 0;

    const addNominee = () => {
        if (!selectedCandidate) {
            return;
        }

        router.post(
            `/dashboard/events/${event.id}/awards/${award.id}/nominees`,
            { nominee_id: Number(selectedCandidate) },
            {
                preserveScroll: true,
                onSuccess: () => setSelectedCandidate(''),
            },
        );
    };

    const removeNominee = (nomineeId: number) => {
        router.delete(
            `/dashboard/events/${event.id}/awards/${award.id}/nominees/${nomineeId}`,
            { preserveScroll: true },
        );
    };

    const copyVotingLink = () => {
        navigator.clipboard.writeText(
            `${window.location.origin}/events/${event.id}/awards/${award.id}/vote`,
        );
        toast.success('Voting link copied to clipboard');
    };

    return (
        <div className="mx-auto flex h-full w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-6 md:px-8 md:py-8">
            <Head title={`${award.title} · ${event.name}`} />

            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex items-start gap-4">
                    <Button
                        variant="outline"
                        size="icon"
                        className="mt-1 h-10 w-10 shrink-0"
                        asChild
                    >
                        <Link
                            href={`/dashboard/events/${event.id}/awards`}
                            aria-label="Back to awards"
                        >
                            <ChevronLeft className="h-5 w-5" />
                        </Link>
                    </Button>
                    <div>
                        <div className="flex flex-wrap items-center gap-2">
                            <h1 className="text-2xl font-bold tracking-tight">
                                {award.title}
                            </h1>
                            <Badge
                                variant={
                                    award.status === 'open'
                                        ? 'default'
                                        : 'secondary'
                                }
                            >
                                {award.status}
                            </Badge>
                            {award.is_paid && (
                                <Badge variant="outline">
                                    {formatRupiah(award.price_per_vote)} / vote
                                </Badge>
                            )}
                        </div>
                        {award.description && (
                            <p className="mt-1 text-sm text-muted-foreground">
                                {award.description}
                            </p>
                        )}
                    </div>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={copyVotingLink}
                        disabled={award.status === 'draft'}
                    >
                        <Link2 className="mr-2 h-4 w-4" />
                        Copy Voting Link
                    </Button>
                    <AwardFormDialog
                        event={event}
                        award={award}
                        pricingLocked={votingLocked}
                        trigger={
                            <Button variant="outline" size="sm">
                                <Pencil className="mr-2 h-4 w-4" />
                                Edit
                            </Button>
                        }
                    />
                </div>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <StatCard label="Votes counted" value={stats.votes_counted} />
                <StatCard label="Ballots" value={stats.ballots_counted} />
                {award.is_paid && (
                    <>
                        <StatCard
                            label="Awaiting payment"
                            value={stats.votes_pending}
                        />
                        <StatCard
                            label="Revenue settled"
                            value={formatRupiah(stats.revenue_settled)}
                        />
                    </>
                )}
            </div>

            <section className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                    <h2 className="text-sm font-semibold tracking-wide uppercase">
                        Ballot
                    </h2>
                    <span className="text-xs text-muted-foreground">
                        {award.nominee_kind === 'player' ? 'Players' : 'Teams'}
                    </span>
                </div>

                {!votingLocked && (
                    <div className="flex gap-2">
                        <Select
                            value={selectedCandidate}
                            onValueChange={setSelectedCandidate}
                        >
                            <SelectTrigger className="flex-1">
                                <SelectValue
                                    placeholder={
                                        candidates.length === 0
                                            ? 'Everyone is already nominated'
                                            : `Add a ${award.nominee_kind}...`
                                    }
                                />
                            </SelectTrigger>
                            <SelectContent>
                                {candidates.map((candidate) => (
                                    <SelectItem
                                        key={candidate.id}
                                        value={String(candidate.id)}
                                    >
                                        {candidate.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Button
                            onClick={addNominee}
                            disabled={!selectedCandidate}
                        >
                            <Plus className="mr-2 h-4 w-4" />
                            Add
                        </Button>
                    </div>
                )}

                {votingLocked && (
                    <p className="rounded-md border border-dashed px-3 py-2 text-xs text-muted-foreground">
                        Votes have been cast, so the ballot is locked. Changing
                        it now would alter what people already voted on.
                    </p>
                )}

                <div className="divide-y rounded-lg border">
                    {ranked.length === 0 && (
                        <p className="px-4 py-8 text-center text-sm text-muted-foreground">
                            Nobody is on the ballot yet. Add at least two
                            nominees before opening this award.
                        </p>
                    )}

                    {ranked.map((nominee, index) => {
                        const votes = nominee.votes_total ?? 0;
                        const share = leader > 0 ? (votes / leader) * 100 : 0;

                        return (
                            <div
                                key={nominee.id}
                                className="flex items-center gap-3 px-4 py-3"
                            >
                                <span className="w-5 shrink-0 text-sm font-semibold text-muted-foreground tabular-nums">
                                    {index + 1}
                                </span>

                                <Avatar>
                                    <AvatarImage
                                        src={
                                            nominee.photo_url
                                                ? formatImageUrl(
                                                      nominee.photo_url,
                                                  )
                                                : undefined
                                        }
                                        alt={nominee.name}
                                    />
                                    <AvatarFallback>
                                        {nominee.name.slice(0, 2).toUpperCase()}
                                    </AvatarFallback>
                                </Avatar>

                                <div className="min-w-0 flex-1">
                                    <p className="truncate text-sm font-medium">
                                        {nominee.name}
                                    </p>
                                    <div
                                        className="mt-1 h-1.5 rounded-full bg-muted"
                                        role="presentation"
                                    >
                                        <div
                                            className="h-1.5 rounded-full bg-primary transition-all"
                                            style={{ width: `${share}%` }}
                                        />
                                    </div>
                                </div>

                                <div className="shrink-0 text-right">
                                    <p className="text-sm font-semibold tabular-nums">
                                        {votes}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        {nominee.voters_count ?? 0} ballot
                                        {(nominee.voters_count ?? 0) === 1
                                            ? ''
                                            : 's'}
                                    </p>
                                </div>

                                {/* Only offered while nobody has voted for them —
                                    the server refuses it once votes exist. */}
                                {votes === 0 && (
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        aria-label={`Remove ${nominee.name}`}
                                        onClick={() =>
                                            removeNominee(nominee.id)
                                        }
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                )}
                            </div>
                        );
                    })}
                </div>
            </section>
        </div>
    );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
    return (
        <div className="rounded-lg border px-3 py-2">
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="text-lg font-semibold tabular-nums">{value}</p>
        </div>
    );
}
