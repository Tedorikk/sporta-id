import { Head, Link, router } from '@inertiajs/react';
import { ChevronLeft, Hash, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { DeleteConfirmationDialog } from '@/components/delete-confirmation-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatDistance } from '@/lib/format-race';
import type { RaceParticipant } from '@/types/race-participant';
import type { RunningEventCategory } from '@/types/running-event-category';
import { RunnerFormDialog } from './components/runner-form-dialog';

interface Props {
    event: { id: number; name: string; category: string | null };
    category: RunningEventCategory;
    participants: RaceParticipant[];
    filters: { search: string | null };
    summary: { total: number; unnumbered: number; finished: number };
    next_bib: string;
}

export default function RaceParticipantsIndex({
    event,
    category,
    participants,
    filters,
    summary,
    next_bib: nextBib,
}: Props) {
    const [search, setSearch] = useState(filters.search ?? '');
    const [isAssigning, setIsAssigning] = useState(false);

    const baseUrl = `/dashboard/events/${event.id}/running-categories/${category.id}`;

    function handleSearch(event_: React.FormEvent) {
        event_.preventDefault();

        router.get(
            `${baseUrl}/participants`,
            { search: search || undefined },
            { preserveState: true, replace: true },
        );
    }

    function handleAssignBibs() {
        router.post(
            `${baseUrl}/bibs`,
            {},
            {
                preserveScroll: true,
                onStart: () => setIsAssigning(true),
                onFinish: () => setIsAssigning(false),
            },
        );
    }

    return (
        <div className="mx-auto flex h-full w-full max-w-4xl flex-1 flex-col gap-6 px-4 py-6 md:px-8 md:py-8">
            <Head title={`Start list · ${category.name}`} />

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
                            Start list
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            {category.name} ·{' '}
                            {formatDistance(category.distance_meters)} ·{' '}
                            {summary.total} runner(s), {summary.unnumbered}{' '}
                            without a bib
                        </p>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <Button
                        variant="outline"
                        onClick={handleAssignBibs}
                        disabled={isAssigning}
                    >
                        <Hash className="mr-2 h-4 w-4" />
                        {isAssigning ? 'Assigning…' : 'Assign bibs'}
                    </Button>

                    <RunnerFormDialog
                        eventId={event.id}
                        category={category}
                        suggestedBib={nextBib}
                        trigger={
                            <Button>
                                <Plus className="mr-2 h-4 w-4" />
                                Add Runner
                            </Button>
                        }
                    />
                </div>
            </div>

            <form onSubmit={handleSearch} className="flex items-center gap-2">
                <div className="relative flex-1">
                    <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search by name or bib number"
                        className="pl-9"
                    />
                </div>
                <Button type="submit" variant="outline">
                    Search
                </Button>
            </form>

            <div className="divide-y rounded-lg border">
                {participants.length === 0 && (
                    <p className="px-4 py-8 text-center text-sm text-muted-foreground">
                        {filters.search
                            ? 'No runner matches that search.'
                            : 'Nobody on this start list yet. Assign bibs to pull in confirmed registrations, or add a walk-in.'}
                    </p>
                )}

                {participants.map((participant) => (
                    <div
                        key={participant.id}
                        className="flex flex-col gap-2 px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-4"
                    >
                        <div className="flex min-w-0 items-center gap-3">
                            <Badge
                                variant={
                                    participant.bib_number
                                        ? 'secondary'
                                        : 'outline'
                                }
                                className="min-w-14 justify-center font-mono"
                            >
                                {participant.bib_number ?? 'no bib'}
                            </Badge>
                            <div className="min-w-0">
                                <p className="truncate text-sm font-medium">
                                    {participant.name}
                                </p>
                                <p className="truncate text-xs text-muted-foreground">
                                    {participant.email ??
                                        (participant.registration_id
                                            ? 'From registration'
                                            : 'Walk-in')}
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <RunnerFormDialog
                                eventId={event.id}
                                category={category}
                                participant={participant}
                                trigger={
                                    <Button variant="ghost" size="icon">
                                        <Pencil className="h-4 w-4" />
                                    </Button>
                                }
                            />

                            <DeleteConfirmationDialog
                                title="Remove runner?"
                                description={`${participant.name} will be taken off this start list. Their registration is not affected.`}
                                confirmationValue={participant.name}
                                onConfirm={() =>
                                    router.delete(
                                        `${baseUrl}/participants/${participant.id}`,
                                        { preserveScroll: true },
                                    )
                                }
                                trigger={
                                    <Button variant="ghost" size="icon">
                                        <Trash2 className="h-4 w-4 text-destructive" />
                                    </Button>
                                }
                            />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
