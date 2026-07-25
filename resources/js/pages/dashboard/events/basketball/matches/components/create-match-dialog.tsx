import { zodResolver } from '@hookform/resolvers/zod';
import { router } from '@inertiajs/react';
import { Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
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
import type { Pool } from '@/types/pool';
import type { Team } from '@/types/team';
import { MATCH_SERVER_FIELD_MAP, MatchFormFields, matchDefaultValues, matchSchema, toScheduledAt, type MatchFormValues } from './match-form';

export function CreateMatchDialog({
    event,
    category,
    pools,
    teams,
    defaultPool,
}: {
    event: Event;
    category: BasketballEventCategory;
    pools: Pool[];
    teams: Team[];
    defaultPool?: Pool;
}) {
    const [open, setOpen] = useState(false);
    const [saving, setSaving] = useState(false);

    const {
        control,
        handleSubmit,
        reset,
        setError,
        setValue,
        formState: { errors },
    } = useForm<MatchFormValues>({
        resolver: zodResolver(matchSchema),
        defaultValues: matchDefaultValues(defaultPool ? { pool_id: String(defaultPool.id) } : undefined),
        mode: 'onChange',
    });

    const poolId = useWatch({ control, name: 'pool_id' });

    // Reset the whole form whenever the dialog is (re)opened, so stale state
    // from a previous match never leaks into the next one.
    useEffect(() => {
        if (open) {
            reset(matchDefaultValues(defaultPool ? { pool_id: String(defaultPool.id) } : undefined));
        }
    }, [open, defaultPool, reset]);

    // Changing the pool invalidates whatever teams were picked from the old one.
    useEffect(() => {
        setValue('home_team_id', '');
        setValue('away_team_id', '');
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [poolId]);

    const onSubmit = (data: MatchFormValues) => {
        setSaving(true);

        router.post(
            `/dashboard/events/${event.id}/basketball-categories/${category.id}/matches`,
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
                <Button size="sm">+ New Match</Button>
            </DialogTrigger>

            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Create Match</DialogTitle>
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
                            showPoolField={!defaultPool && pools.length > 0}
                        />
                    </FieldGroup>

                    <DialogFooter className="mt-4">
                        <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={saving}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={saving}>
                            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                            {saving ? 'Creating...' : 'Create'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
