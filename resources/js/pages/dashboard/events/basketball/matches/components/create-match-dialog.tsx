import { zodResolver } from '@hookform/resolvers/zod';
import { router } from '@inertiajs/react';
import { Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import {
    Field,
    FieldDescription,
    FieldError,
    FieldGroup,
    FieldLabel,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { BasketballEventCategory } from '@/types/basketball-event-category';
import type { Event } from '@/types/event';
import type { Pool } from '@/types/pool';
import type { Team } from '@/types/team';
import { ROUND_OPTIONS } from './constants';

// ─── Schema ───────────────────────────────────────────────────────────────────

const matchSchema = z
    .object({
        pool_id: z.string(),
        home_team_id: z.string().min(1, 'Select the home team'),
        away_team_id: z.string().min(1, 'Select the away team'),
        round: z.string().min(1, 'Select a round'),
        match_number: z.string(),
        date: z.string(),
        time: z.string(),
    })
    .refine((data) => data.home_team_id !== data.away_team_id, {
        message: 'Home and away teams must be different',
        path: ['away_team_id'],
    });

type MatchFormValues = z.infer<typeof matchSchema>;

// Server field names -> form field names, so validation errors coming back
// from Laravel land on the right input instead of disappearing silently.
const SERVER_FIELD_MAP: Record<string, keyof MatchFormValues | 'root'> = {
    pool_id: 'pool_id',
    home_team_id: 'home_team_id',
    away_team_id: 'away_team_id',
    round: 'round',
    match_number: 'match_number',
    scheduled_at: 'date',
    match: 'root',
};

function defaultValues(defaultPool?: Pool): MatchFormValues {
    return {
        pool_id: defaultPool ? String(defaultPool.id) : '',
        home_team_id: '',
        away_team_id: '',
        round: 'group',
        match_number: '',
        date: '',
        time: '',
    };
}

// ─── Component ────────────────────────────────────────────────────────────────

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
        defaultValues: defaultValues(defaultPool),
        mode: 'onChange',
    });

    const poolId = useWatch({ control, name: 'pool_id' });
    const homeTeamId = useWatch({ control, name: 'home_team_id' });

    // Reset the whole form whenever the dialog is (re)opened, so stale state
    // from a previous match never leaks into the next one.
    useEffect(() => {
        if (open) {
            reset(defaultValues(defaultPool));
        }
    }, [open, defaultPool, reset]);

    // Changing the pool invalidates whatever teams were picked from the old one.
    useEffect(() => {
        setValue('home_team_id', '');
        setValue('away_team_id', '');
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [poolId]);

    const availableTeams = poolId === ''
        ? teams
        : (pools.find((p) => String(p.id) === poolId)?.teams ?? []);

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
                scheduled_at: data.date && data.time ? `${data.date} ${data.time}` : null,
            },
            {
                preserveScroll: true,
                onSuccess: () => setOpen(false),
                onError: (serverErrors) => {
                    Object.entries(serverErrors).forEach(([field, message]) => {
                        const formField = SERVER_FIELD_MAP[field] ?? 'root';
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

                        {!defaultPool && (
                            <Controller
                                name="pool_id"
                                control={control}
                                render={({ field, fieldState }) => (
                                    <Field data-invalid={fieldState.invalid}>
                                        <FieldLabel htmlFor="pool_id">Pool</FieldLabel>
                                        <Select value={field.value} onValueChange={field.onChange}>
                                            <SelectTrigger id="pool_id" aria-invalid={fieldState.invalid}>
                                                <SelectValue placeholder="Select Pool" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {pools.map((pool) => (
                                                    <SelectItem key={pool.id} value={String(pool.id)}>
                                                        {pool.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                                    </Field>
                                )}
                            />
                        )}

                        <Controller
                            name="home_team_id"
                            control={control}
                            render={({ field, fieldState }) => (
                                <Field data-invalid={fieldState.invalid}>
                                    <FieldLabel htmlFor="home_team_id">Home Team</FieldLabel>
                                    <Select value={field.value} onValueChange={field.onChange}>
                                        <SelectTrigger id="home_team_id" aria-invalid={fieldState.invalid}>
                                            <SelectValue placeholder="Select Team" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {availableTeams.map((team) => (
                                                <SelectItem key={team.id} value={String(team.id)}>
                                                    {team.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                                </Field>
                            )}
                        />

                        <Controller
                            name="away_team_id"
                            control={control}
                            render={({ field, fieldState }) => (
                                <Field data-invalid={fieldState.invalid}>
                                    <FieldLabel htmlFor="away_team_id">Away Team</FieldLabel>
                                    <Select value={field.value} onValueChange={field.onChange}>
                                        <SelectTrigger id="away_team_id" aria-invalid={fieldState.invalid}>
                                            <SelectValue placeholder="Select Team" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {availableTeams
                                                .filter((team) => String(team.id) !== homeTeamId)
                                                .map((team) => (
                                                    <SelectItem key={team.id} value={String(team.id)}>
                                                        {team.name}
                                                    </SelectItem>
                                                ))}
                                        </SelectContent>
                                    </Select>
                                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                                </Field>
                            )}
                        />

                        <Controller
                            name="round"
                            control={control}
                            render={({ field, fieldState }) => (
                                <Field data-invalid={fieldState.invalid}>
                                    <FieldLabel htmlFor="round">Round</FieldLabel>
                                    <Select value={field.value} onValueChange={field.onChange}>
                                        <SelectTrigger id="round" aria-invalid={fieldState.invalid}>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {ROUND_OPTIONS.map((option) => (
                                                <SelectItem key={option.value} value={option.value}>
                                                    {option.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                                </Field>
                            )}
                        />

                        <Controller
                            name="match_number"
                            control={control}
                            render={({ field, fieldState }) => (
                                <Field data-invalid={fieldState.invalid}>
                                    <FieldLabel htmlFor="match_number">Match Number</FieldLabel>
                                    <Input
                                        {...field}
                                        id="match_number"
                                        type="number"
                                        placeholder="Auto-assigned if left blank"
                                        aria-invalid={fieldState.invalid}
                                    />
                                    <FieldDescription>Leave blank to auto-assign the next number.</FieldDescription>
                                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                                </Field>
                            )}
                        />

                        <FieldGroup className="grid grid-cols-2 gap-2">
                            <Controller
                                name="date"
                                control={control}
                                render={({ field, fieldState }) => (
                                    <Field data-invalid={fieldState.invalid}>
                                        <FieldLabel htmlFor="date">Date</FieldLabel>
                                        <Input {...field} id="date" type="date" aria-invalid={fieldState.invalid} />
                                        {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                                    </Field>
                                )}
                            />
                            <Controller
                                name="time"
                                control={control}
                                render={({ field, fieldState }) => (
                                    <Field data-invalid={fieldState.invalid}>
                                        <FieldLabel htmlFor="time">Time</FieldLabel>
                                        <Input {...field} id="time" type="time" aria-invalid={fieldState.invalid} />
                                        {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                                    </Field>
                                )}
                            />
                        </FieldGroup>
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