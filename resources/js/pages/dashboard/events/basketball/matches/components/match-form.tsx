import { format } from 'date-fns';
import { CalendarIcon, Clock } from 'lucide-react';
import { Controller, useWatch } from 'react-hook-form';
import type { Control } from 'react-hook-form';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
    Field,
    FieldDescription,
    FieldError,
    FieldGroup,
    FieldLabel,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import type { Pool } from '@/types/pool';
import type { Team } from '@/types/team';
import { ROUND_OPTIONS } from './constants';

// ─── Schema ───────────────────────────────────────────────────────────────────

// Exported unrefined so callers that need extra fields (e.g. a category
// picker) can .extend() it before applying the same home/away refinement.
export const matchFieldsSchema = z.object({
    pool_id: z.string(),
    home_team_id: z.string().min(1, 'Select the home team'),
    away_team_id: z.string().min(1, 'Select the away team'),
    round: z.string().min(1, 'Select a round'),
    match_number: z.string(),
    date: z.string(),
    time: z.string(),
});

export const matchSchema = matchFieldsSchema.refine(
    (data) => data.home_team_id !== data.away_team_id,
    {
        message: 'Home and away teams must be different',
        path: ['away_team_id'],
    },
);

export type MatchFormValues = z.infer<typeof matchSchema>;

// Server field names -> form field names, so validation errors coming back
// from Laravel land on the right input instead of disappearing silently.
export const MATCH_SERVER_FIELD_MAP: Record<
    string,
    keyof MatchFormValues | 'root'
> = {
    pool_id: 'pool_id',
    home_team_id: 'home_team_id',
    away_team_id: 'away_team_id',
    round: 'round',
    match_number: 'match_number',
    scheduled_at: 'date',
    match: 'root',
};

// The date/time pickers work in the browser's local wall-clock time, but the
// server (and its JSON responses) are UTC — send a real UTC instant here so
// the round-trip through formatDateTime()/toLocaleString() lands on the same
// local time the admin picked, instead of drifting by the timezone offset.
export function toScheduledAt(date: string, time: string): string | null {
    if (!date || !time) {
        return null;
    }

    return new Date(`${date}T${time}:00`).toISOString();
}

export function matchDefaultValues(
    overrides?: Partial<MatchFormValues>,
): MatchFormValues {
    return {
        pool_id: '',
        home_team_id: '',
        away_team_id: '',
        round: 'group',
        match_number: '',
        date: '',
        time: '',
        ...overrides,
    };
}

// ─── Shared field UI ────────────────────────────────────────────────────────

export function MatchFormFields({
    control,
    pools,
    teams,
    showPoolField,
}: {
    control: Control<MatchFormValues>;
    pools: Pool[];
    teams: Team[];
    showPoolField: boolean;
}) {
    const poolId = useWatch({ control, name: 'pool_id' });
    const homeTeamId = useWatch({ control, name: 'home_team_id' });

    const availableTeams =
        poolId === ''
            ? teams
            : (pools.find((p) => String(p.id) === poolId)?.teams ?? teams);

    return (
        <>
            {showPoolField && (
                <Controller
                    name="pool_id"
                    control={control}
                    render={({ field, fieldState }) => (
                        <Field data-invalid={fieldState.invalid}>
                            <FieldLabel htmlFor="pool_id">Pool</FieldLabel>
                            <Select
                                value={field.value}
                                onValueChange={field.onChange}
                            >
                                <SelectTrigger
                                    id="pool_id"
                                    aria-invalid={fieldState.invalid}
                                >
                                    <SelectValue placeholder="Select Pool" />
                                </SelectTrigger>
                                <SelectContent>
                                    {pools.map((pool) => (
                                        <SelectItem
                                            key={pool.id}
                                            value={String(pool.id)}
                                        >
                                            {pool.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {fieldState.invalid && (
                                <FieldError errors={[fieldState.error]} />
                            )}
                        </Field>
                    )}
                />
            )}

            <Controller
                name="home_team_id"
                control={control}
                render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                        <FieldLabel htmlFor="home_team_id">
                            Home Team
                        </FieldLabel>
                        <Select
                            value={field.value}
                            onValueChange={field.onChange}
                        >
                            <SelectTrigger
                                id="home_team_id"
                                aria-invalid={fieldState.invalid}
                            >
                                <SelectValue placeholder="Select Team" />
                            </SelectTrigger>
                            <SelectContent>
                                {availableTeams.map((team) => (
                                    <SelectItem
                                        key={team.id}
                                        value={String(team.id)}
                                    >
                                        {team.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        {fieldState.invalid && (
                            <FieldError errors={[fieldState.error]} />
                        )}
                    </Field>
                )}
            />

            <Controller
                name="away_team_id"
                control={control}
                render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                        <FieldLabel htmlFor="away_team_id">
                            Away Team
                        </FieldLabel>
                        <Select
                            value={field.value}
                            onValueChange={field.onChange}
                        >
                            <SelectTrigger
                                id="away_team_id"
                                aria-invalid={fieldState.invalid}
                            >
                                <SelectValue placeholder="Select Team" />
                            </SelectTrigger>
                            <SelectContent>
                                {availableTeams
                                    .filter(
                                        (team) =>
                                            String(team.id) !== homeTeamId,
                                    )
                                    .map((team) => (
                                        <SelectItem
                                            key={team.id}
                                            value={String(team.id)}
                                        >
                                            {team.name}
                                        </SelectItem>
                                    ))}
                            </SelectContent>
                        </Select>
                        {fieldState.invalid && (
                            <FieldError errors={[fieldState.error]} />
                        )}
                    </Field>
                )}
            />

            <Controller
                name="round"
                control={control}
                render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                        <FieldLabel htmlFor="round">Round</FieldLabel>
                        <Select
                            value={field.value}
                            onValueChange={field.onChange}
                        >
                            <SelectTrigger
                                id="round"
                                aria-invalid={fieldState.invalid}
                            >
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {ROUND_OPTIONS.map((option) => (
                                    <SelectItem
                                        key={option.value}
                                        value={option.value}
                                    >
                                        {option.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        {fieldState.invalid && (
                            <FieldError errors={[fieldState.error]} />
                        )}
                    </Field>
                )}
            />

            <Controller
                name="match_number"
                control={control}
                render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                        <FieldLabel htmlFor="match_number">
                            Match Number
                        </FieldLabel>
                        <Input
                            {...field}
                            id="match_number"
                            type="number"
                            placeholder="Auto-assigned if left blank"
                            aria-invalid={fieldState.invalid}
                        />
                        <FieldDescription>
                            Leave blank to auto-assign the next number.
                        </FieldDescription>
                        {fieldState.invalid && (
                            <FieldError errors={[fieldState.error]} />
                        )}
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
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button
                                        id="date"
                                        variant="outline"
                                        aria-label="Date"
                                        aria-invalid={fieldState.invalid}
                                        className={cn(
                                            'w-full cursor-pointer justify-start text-left font-normal',
                                            !field.value &&
                                                'text-muted-foreground',
                                        )}
                                    >
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {field.value ? (
                                            format(new Date(field.value), 'PPP')
                                        ) : (
                                            <span>Pick a date</span>
                                        )}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent
                                    className="w-auto p-0"
                                    align="start"
                                >
                                    <Calendar
                                        mode="single"
                                        selected={
                                            field.value
                                                ? new Date(field.value)
                                                : undefined
                                        }
                                        onSelect={(date) =>
                                            field.onChange(
                                                date
                                                    ? format(date, 'yyyy-MM-dd')
                                                    : '',
                                            )
                                        }
                                        autoFocus
                                    />
                                </PopoverContent>
                            </Popover>
                            {fieldState.invalid && (
                                <FieldError errors={[fieldState.error]} />
                            )}
                        </Field>
                    )}
                />
                <Controller
                    name="time"
                    control={control}
                    render={({ field, fieldState }) => (
                        <Field data-invalid={fieldState.invalid}>
                            <FieldLabel htmlFor="time">Time</FieldLabel>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button
                                        id="time"
                                        variant="outline"
                                        aria-label="Time"
                                        aria-invalid={fieldState.invalid}
                                        className={cn(
                                            'w-full cursor-pointer justify-start text-left font-normal',
                                            !field.value &&
                                                'text-muted-foreground',
                                        )}
                                    >
                                        <Clock className="mr-2 h-4 w-4" />
                                        {field.value ? (
                                            field.value
                                        ) : (
                                            <span>Pick a time</span>
                                        )}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent
                                    className="w-auto p-3"
                                    align="start"
                                >
                                    <Input
                                        value={field.value}
                                        onChange={field.onChange}
                                        type="time"
                                        aria-invalid={fieldState.invalid}
                                        autoFocus
                                    />
                                </PopoverContent>
                            </Popover>
                            {fieldState.invalid && (
                                <FieldError errors={[fieldState.error]} />
                            )}
                        </Field>
                    )}
                />
            </FieldGroup>
        </>
    );
}
