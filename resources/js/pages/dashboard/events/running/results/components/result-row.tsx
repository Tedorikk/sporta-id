import { router } from '@inertiajs/react';
import { Check } from 'lucide-react';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { formatDuration, parseDuration } from '@/lib/format-race';
import type {
    RaceParticipant,
    RaceParticipantStatus,
} from '@/types/race-participant';

const STATUS_LABELS: Record<RaceParticipantStatus, string> = {
    registered: 'No result',
    finished: 'Finished',
    dnf: 'DNF',
    dns: 'DNS',
    dq: 'DQ',
};

interface ResultRowProps {
    eventId: number;
    categoryId: number;
    participant: RaceParticipant;
}

/**
 * One runner's result, edited in place. Times are typed the way they are read
 * off a stopwatch, so the row validates the shape before it posts and only
 * asks the server about the rest.
 */
export function ResultRow({
    eventId,
    categoryId,
    participant,
}: ResultRowProps) {
    const [status, setStatus] = useState<RaceParticipantStatus>(
        participant.status,
    );
    const [time, setTime] = useState(
        participant.duration_seconds === null
            ? ''
            : formatDuration(participant.duration_seconds),
    );
    const [error, setError] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    const needsTime = status === 'finished';

    function handleSave() {
        if (needsTime && parseDuration(time) === null) {
            setError('Use 48:12 or 3:41:07');

            return;
        }

        setError(null);

        router.patch(
            `/dashboard/events/${eventId}/running-categories/${categoryId}/results/${participant.id}`,
            { status, finish_time: needsTime ? time : '' },
            {
                preserveScroll: true,
                onStart: () => setIsSaving(true),
                onFinish: () => setIsSaving(false),
            },
        );
    }

    return (
        <div className="flex flex-col gap-2 px-3 py-3 sm:flex-row sm:items-center sm:gap-4 sm:px-4">
            <div className="flex min-w-0 flex-1 items-center gap-3">
                <Badge
                    variant={participant.bib_number ? 'secondary' : 'outline'}
                    className="min-w-14 justify-center font-mono"
                >
                    {participant.bib_number ?? 'no bib'}
                </Badge>
                <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                        {participant.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                        {STATUS_LABELS[participant.status]}
                    </p>
                </div>
            </div>

            <div className="flex items-center gap-2">
                <Select
                    value={status}
                    onValueChange={(value) =>
                        setStatus(value as RaceParticipantStatus)
                    }
                >
                    <SelectTrigger className="w-32 cursor-pointer">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        {(
                            Object.keys(
                                STATUS_LABELS,
                            ) as RaceParticipantStatus[]
                        ).map((value) => (
                            <SelectItem
                                key={value}
                                value={value}
                                className="cursor-pointer"
                            >
                                {STATUS_LABELS[value]}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                <div className="w-28">
                    <Input
                        value={time}
                        onChange={(e) => setTime(e.target.value)}
                        placeholder="48:12"
                        disabled={!needsTime}
                        aria-invalid={Boolean(error)}
                        aria-label={`Finish time for ${participant.name}`}
                    />
                    {error && (
                        <p className="mt-1 text-xs text-destructive">{error}</p>
                    )}
                </div>

                <Button
                    variant="outline"
                    size="icon"
                    onClick={handleSave}
                    disabled={isSaving}
                    aria-label={`Save result for ${participant.name}`}
                >
                    <Check className="h-4 w-4" />
                </Button>
            </div>
        </div>
    );
}
