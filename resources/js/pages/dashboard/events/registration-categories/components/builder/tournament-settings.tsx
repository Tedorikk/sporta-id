import {
    Field,
    FieldDescription,
    FieldGroup,
    FieldLabel,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import type {
    TournamentFormat,
    TournamentSettings,
} from '@/types/registration-category';
import { TOURNAMENT_FORMATS } from '@/types/registration-category';

/**
 * Inputs hold strings (what an <input> produces); the builder turns them into
 * the numeric/null shape the API expects on save.
 */
export interface TournamentDraft {
    format: TournamentFormat;
    win_points: string;
    loss_points: string;
    min_team: string;
    min_player_per_team: string;
    max_player_per_team: string;
    max_player_per_coach: string;
    roster_closes_at: string;
}

export function toTournamentDraft(
    settings: TournamentSettings | null | undefined,
    fallback: TournamentSettings,
): TournamentDraft {
    const s = settings ?? fallback;

    return {
        format: s.format,
        win_points: String(s.win_points),
        loss_points: String(s.loss_points),
        min_team: String(s.min_team),
        min_player_per_team: String(s.min_player_per_team),
        max_player_per_team:
            s.max_player_per_team != null ? String(s.max_player_per_team) : '',
        max_player_per_coach:
            s.max_player_per_coach != null
                ? String(s.max_player_per_coach)
                : '',
        roster_closes_at: s.roster_closes_at?.slice(0, 16) ?? '',
    };
}

function intOrNull(value: string): number | null {
    return value.trim() === '' ? null : Number(value);
}

export function fromTournamentDraft(
    draft: TournamentDraft,
): TournamentSettings {
    return {
        format: draft.format,
        win_points: Number(draft.win_points),
        loss_points: Number(draft.loss_points),
        min_team: Number(draft.min_team),
        min_player_per_team: Number(draft.min_player_per_team),
        max_player_per_team: intOrNull(draft.max_player_per_team),
        max_player_per_coach: intOrNull(draft.max_player_per_coach),
        roster_closes_at: draft.roster_closes_at || null,
    };
}

interface TournamentSettingsFieldsProps {
    enabled: boolean;
    /** Existing tournaments keep their teams/pools, so the switch can't be turned off. */
    lockedOn: boolean;
    onEnabledChange: (enabled: boolean) => void;
    draft: TournamentDraft;
    onChange: (patch: Partial<TournamentDraft>) => void;
}

function NumberField({
    id,
    label,
    value,
    onChange,
    min,
    optional,
    disabled,
}: {
    id: keyof TournamentDraft;
    label: string;
    value: string;
    onChange: (value: string) => void;
    min: number;
    optional?: boolean;
    disabled?: boolean;
}) {
    return (
        <Field>
            <FieldLabel htmlFor={`tournament_${id}`}>
                {label}
                {optional && (
                    <span className="font-normal text-muted-foreground">
                        {' '}
                        (Optional)
                    </span>
                )}
            </FieldLabel>
            <Input
                id={`tournament_${id}`}
                type="number"
                min={min}
                step="1"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={optional ? 'No limit' : undefined}
                disabled={disabled}
            />
        </Field>
    );
}

export function TournamentSettingsFields({
    enabled,
    lockedOn,
    onEnabledChange,
    draft,
    onChange,
}: TournamentSettingsFieldsProps) {
    const isRoundRobin = draft.format === 'round_robin';

    return (
        <FieldGroup className="border-t pt-4">
            <Field orientation="horizontal" className="items-center">
                <Switch
                    id="tournament_enabled"
                    checked={enabled}
                    onCheckedChange={onEnabledChange}
                    disabled={lockedOn}
                />
                <div className="min-w-0">
                    <FieldLabel
                        htmlFor="tournament_enabled"
                        className="font-medium"
                    >
                        Runs a basketball tournament
                    </FieldLabel>
                    <FieldDescription>
                        {lockedOn
                            ? 'Teams, pools and matches are attached to this category, so the tournament stays on.'
                            : 'Registered teams get pools, a bracket and standings under Match Categories.'}
                    </FieldDescription>
                </div>
            </Field>

            {enabled && (
                <>
                    <Field>
                        <FieldLabel htmlFor="tournament_format">
                            Tournament format
                        </FieldLabel>
                        <Select
                            value={draft.format}
                            onValueChange={(value) =>
                                onChange({ format: value as TournamentFormat })
                            }
                        >
                            <SelectTrigger
                                id="tournament_format"
                                className="w-full"
                            >
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {TOURNAMENT_FORMATS.map((format) => (
                                    <SelectItem
                                        key={format.value}
                                        value={format.value}
                                    >
                                        {format.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <FieldDescription>
                            {
                                TOURNAMENT_FORMATS.find(
                                    (f) => f.value === draft.format,
                                )?.description
                            }
                        </FieldDescription>
                    </Field>

                    <div className="grid grid-cols-2 gap-3">
                        <NumberField
                            id="win_points"
                            label="Points per win"
                            value={draft.win_points}
                            onChange={(v) => onChange({ win_points: v })}
                            min={0}
                        />
                        <NumberField
                            id="loss_points"
                            label="Points per loss"
                            value={draft.loss_points}
                            onChange={(v) => onChange({ loss_points: v })}
                            min={0}
                        />
                    </div>

                    <NumberField
                        id="min_team"
                        label="Min. teams to run"
                        value={draft.min_team}
                        onChange={(v) => onChange({ min_team: v })}
                        min={2}
                    />

                    <div className="grid grid-cols-2 gap-3">
                        <NumberField
                            id="min_player_per_team"
                            label="Min. players/team"
                            value={draft.min_player_per_team}
                            onChange={(v) =>
                                onChange({ min_player_per_team: v })
                            }
                            min={1}
                        />
                        <NumberField
                            id="max_player_per_team"
                            label="Max. players/team"
                            value={draft.max_player_per_team}
                            onChange={(v) =>
                                onChange({ max_player_per_team: v })
                            }
                            min={1}
                            optional
                        />
                    </div>

                    <NumberField
                        id="max_player_per_coach"
                        label="Max. players/coach"
                        value={draft.max_player_per_coach}
                        onChange={(v) => onChange({ max_player_per_coach: v })}
                        min={1}
                        optional
                        disabled={isRoundRobin}
                    />

                    <Field>
                        <FieldLabel htmlFor="tournament_roster_closes_at">
                            Roster deadline{' '}
                            <span className="font-normal text-muted-foreground">
                                (Optional)
                            </span>
                        </FieldLabel>
                        <Input
                            id="tournament_roster_closes_at"
                            type="datetime-local"
                            value={draft.roster_closes_at}
                            onChange={(e) =>
                                onChange({ roster_closes_at: e.target.value })
                            }
                        />
                        <FieldDescription>
                            Captains can edit their roster until this time.
                            Leave empty to close together with registration.
                        </FieldDescription>
                    </Field>
                </>
            )}
        </FieldGroup>
    );
}
