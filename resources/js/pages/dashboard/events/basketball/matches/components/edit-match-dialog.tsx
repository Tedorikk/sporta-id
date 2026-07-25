import { zodResolver } from '@hookform/resolvers/zod';
import { router } from '@inertiajs/react';
import { format } from 'date-fns';
import { Loader2, Pencil } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { FieldGroup } from '@/components/ui/field';
import type { BasketballEventCategory } from '@/types/basketball-event-category';
import type { Event } from '@/types/event';
import type { GameMatch } from '@/types/game-match';
import type { Pool } from '@/types/pool';
import type { Team } from '@/types/team';
import { MATCH_SERVER_FIELD_MAP, MatchFormFields, matchDefaultValues, matchSchema, toScheduledAt, type MatchFormValues } from './match-form';

function editDefaultValues(match: GameMatch): MatchFormValues {
    const scheduled = match.scheduled_at ? new Date(match.scheduled_at) : null;

    return matchDefaultValues({
        pool_id: match.pool_id ? String(match.pool_id) : '',
        home_team_id: match.home_team_id ? String(match.home_team_id) : '',
        away_team_id: match.away_team_id ? String(match.away_team_id) : '',
        round: match.round ?? 'group',
        match_number: match.match_number ? String(match.match_number) : '',
        date: scheduled ? format(scheduled, 'yyyy-MM-dd') : '',
        time: scheduled ? format(scheduled, 'HH:mm') : '',
    });
}

export function EditMatchDialog({
    event,
    category,
    pools,
    teams,
    match,
}: {
    event: Event;
    category: BasketballEventCategory;
    pools: Pool[];
    teams: Team[];
    match: GameMatch;
}) {
    const [open, setOpen] = useState(false);
    const [saving, setSaving] = useState(false);

    const {
        control,
        handleSubmit,
        reset,
        setError,
        formState: { errors },
    } = useForm<MatchFormValues>({
        resolver: zodResolver(matchSchema),
        defaultValues: editDefaultValues(match),
        mode: 'onChange',
    });

    // Reset to this match's current values whenever the dialog (re)opens.
    useEffect(() => {
        if (open) {
            reset(editDefaultValues(match));
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, match, reset]);

    const onSubmit = (data: MatchFormValues) => {
        setSaving(true);

        router.put(
            `/dashboard/events/${event.id}/basketball-categories/${category.id}/matches/${match.id}`,
            {
                pool_id: data.pool_id || null,
                home_team_id: data.home_team_id,
                away_team_id: data.away_team_id,
                round: data.round,
                match_number: data.match_number || null,
                scheduled_at: toScheduledAt(data.date, data.time),
            },
            {
                preserveScroll: true,
                onSuccess: () => setOpen(false),
                onError: (serverErrors) => {
                    Object.entries(serverErrors).forEach(([field, message]) => {
                        const formField = MATCH_SERVER_FIELD_MAP[field] ?? 'root';
                        setError(formField, { type: 'server', message: String(message) });
                    });
                },
                onFinish: () => setSaving(false),
            },
        );
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="ghost" size="sm" className="h-7 px-2 text-xs gap-1">
                    <Pencil className="h-3 w-3" />
                    Edit
                </Button>
            </DialogTrigger>

            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Edit Match</DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit(onSubmit)}>
                    <FieldGroup>
                        {errors.root && (
                            <p className="text-sm font-medium text-destructive">
                                {errors.root.message}
                            </p>
                        )}

                        <MatchFormFields
                            control={control}
                            pools={pools}
                            teams={teams}
                            showPoolField={pools.length > 0}
                        />
                    </FieldGroup>

                    <DialogFooter className="mt-4">
                        <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={saving}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={saving}>
                            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                            {saving ? 'Saving...' : 'Save Changes'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
