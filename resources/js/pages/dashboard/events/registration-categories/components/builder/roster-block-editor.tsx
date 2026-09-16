import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Field, FieldDescription, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import type { PlayerRole } from '@/types/player';
import { PLAYER_ROLES, playerRoleLabel } from '@/types/player';
import type {
    RosterMemberField,
    RosterMemberFieldType,
    RosterSlot,
} from '@/types/registration-category';
import { ROSTER_MEMBER_FIELD_TYPES } from '@/types/registration-category';
import type { PlayerLimits } from './field-list';
import { OptionEditor } from './option-editor';

/** The fixed questions every member answers — shown so organisers know what not to add again. */
const FIXED_MEMBER_QUESTIONS =
    'Every member is always asked for a photo, identity document, name, place and date of birth, and WhatsApp number; players also give a jersey number.';

function slugKey(label: string): string {
    return (
        label
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '_')
            .replace(/^_+|_+$/g, '') || 'field'
    );
}

interface RosterBlockEditorProps {
    slots: RosterSlot[];
    memberFields: RosterMemberField[];
    detailsOnForm: boolean;
    /**
     * When the category runs a tournament, the player slot's min/max are the
     * tournament's own limits (the server resolves them the same way), so
     * they are shown here but edited in Tournament settings.
     */
    playerLimits?: PlayerLimits | null;
    onChange: (patch: {
        slots?: RosterSlot[];
        member_fields?: RosterMemberField[];
        details_on_form?: boolean;
    }) => void;
}

export function RosterBlockEditor({
    slots,
    memberFields,
    detailsOnForm,
    playerLimits = null,
    onChange,
}: RosterBlockEditorProps) {
    function updateSlot(index: number, patch: Partial<RosterSlot>) {
        onChange({
            slots: slots.map((s, i) => (i === index ? { ...s, ...patch } : s)),
        });
    }

    function addSlot() {
        const used = new Set(slots.map((s) => s.role));
        const next =
            PLAYER_ROLES.find((r) => !used.has(r.value))?.value ?? 'player';

        onChange({
            slots: [
                ...slots,
                { role: next, label: playerRoleLabel(next), min: 1, max: 1 },
            ],
        });
    }

    function removeSlot(index: number) {
        onChange({ slots: slots.filter((_, i) => i !== index) });
    }

    function updateMemberField(
        index: number,
        patch: Partial<RosterMemberField>,
    ) {
        onChange({
            member_fields: memberFields.map((f, i) =>
                i === index ? { ...f, ...patch } : f,
            ),
        });
    }

    function addMemberField() {
        const existing = memberFields.map((f) => f.key);
        let key = 'question';
        let n = 2;

        while (existing.includes(key)) {
            key = `question_${n++}`;
        }

        onChange({
            member_fields: [
                ...memberFields,
                { key, label: '', type: 'text', required: false },
            ],
        });
    }

    function removeMemberField(index: number) {
        onChange({ member_fields: memberFields.filter((_, i) => i !== index) });
    }

    return (
        <div className="flex flex-col gap-4">
            <div className="flex items-start gap-2 rounded-md border bg-background p-3">
                <Checkbox
                    id="roster-details-on-form"
                    checked={detailsOnForm}
                    onCheckedChange={(checked) =>
                        onChange({ details_on_form: Boolean(checked) })
                    }
                    className="mt-0.5"
                />
                <div className="flex flex-col gap-0.5">
                    <label
                        htmlFor="roster-details-on-form"
                        className="text-sm font-medium"
                    >
                        Collect each member’s details on this form
                    </label>
                    <p className="text-xs text-muted-foreground">
                        Photo, identity document, birth details and WhatsApp
                        number for every member, before the team can submit.
                        Unticked, the form only asks name, role and jersey
                        number — the team completes the rest in the roster
                        portal before the roster deadline, so a manager can
                        register and pay before every parent has sent a
                        document.
                    </p>
                </div>
            </div>

            <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-sm font-medium">Slots</p>
                        <p className="text-xs text-muted-foreground">
                            Which roles a team enters, and how many of each.
                        </p>
                    </div>
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={addSlot}
                    >
                        <Plus className="mr-1.5 h-3.5 w-3.5" />
                        Slot
                    </Button>
                </div>

                {slots.length === 0 && (
                    <p className="rounded-md border border-dashed px-3 py-4 text-center text-xs text-muted-foreground">
                        Add at least one slot — e.g. 5–12 players.
                    </p>
                )}

                {slots.map((slot, index) => {
                    const followsTournament =
                        slot.role === 'player' && playerLimits !== null;
                    const shownMin = followsTournament
                        ? playerLimits.min
                        : slot.min;
                    const shownMax = followsTournament
                        ? playerLimits.max
                        : slot.max;

                    return (
                        <div
                            key={index}
                            className="grid grid-cols-[1fr_1fr_4rem_4rem_auto] items-end gap-2 rounded-md border bg-background p-2"
                        >
                            <Field>
                                <FieldLabel className="text-xs">
                                    Role
                                </FieldLabel>
                                <Select
                                    value={slot.role}
                                    onValueChange={(value) =>
                                        updateSlot(index, {
                                            role: value as PlayerRole,
                                            label:
                                                slot.label ||
                                                playerRoleLabel(
                                                    value as PlayerRole,
                                                ),
                                        })
                                    }
                                >
                                    <SelectTrigger className="h-8 w-full text-xs">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {PLAYER_ROLES.map((role) => (
                                            <SelectItem
                                                key={role.value}
                                                value={role.value}
                                            >
                                                {role.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </Field>
                            <Field>
                                <FieldLabel className="text-xs">
                                    Shown as
                                </FieldLabel>
                                <Input
                                    className="h-8 text-xs"
                                    value={slot.label}
                                    onChange={(e) =>
                                        updateSlot(index, {
                                            label: e.target.value,
                                        })
                                    }
                                    placeholder={playerRoleLabel(slot.role)}
                                />
                            </Field>
                            <Field>
                                <FieldLabel className="text-xs">Min</FieldLabel>
                                <Input
                                    className="h-8 text-xs"
                                    type="number"
                                    min={0}
                                    value={shownMin}
                                    disabled={followsTournament}
                                    title={
                                        followsTournament
                                            ? 'Follows Min players/team in Tournament settings'
                                            : undefined
                                    }
                                    onChange={(e) =>
                                        updateSlot(index, {
                                            min: Math.max(
                                                0,
                                                Number(e.target.value) || 0,
                                            ),
                                        })
                                    }
                                />
                            </Field>
                            <Field>
                                <FieldLabel className="text-xs">Max</FieldLabel>
                                <Input
                                    className="h-8 text-xs"
                                    type="number"
                                    min={slot.min}
                                    value={shownMax ?? ''}
                                    disabled={followsTournament}
                                    title={
                                        followsTournament
                                            ? 'Follows Max players/team in Tournament settings'
                                            : undefined
                                    }
                                    placeholder="∞"
                                    onChange={(e) =>
                                        updateSlot(index, {
                                            max:
                                                e.target.value === ''
                                                    ? null
                                                    : Number(e.target.value),
                                        })
                                    }
                                />
                            </Field>
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                onClick={() => removeSlot(index)}
                                aria-label="Remove slot"
                            >
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </div>
                    );
                })}

                {playerLimits !== null && (
                    <p className="text-xs text-muted-foreground">
                        The player slot’s min/max follow{' '}
                        <span className="font-medium">
                            Min/Max players per team
                        </span>{' '}
                        in Tournament settings — change them there.
                    </p>
                )}
            </div>

            <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-sm font-medium">
                            Extra questions per member
                        </p>
                        <FieldDescription>
                            {FIXED_MEMBER_QUESTIONS}
                        </FieldDescription>
                    </div>
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={addMemberField}
                    >
                        <Plus className="mr-1.5 h-3.5 w-3.5" />
                        Question
                    </Button>
                </div>

                {memberFields.map((mf, index) => (
                    <div
                        key={index}
                        className="flex flex-col gap-2 rounded-md border bg-background p-2"
                    >
                        <div className="grid grid-cols-[1fr_1fr_8rem_auto] items-end gap-2">
                            <Field>
                                <FieldLabel className="text-xs">
                                    Label
                                </FieldLabel>
                                <Input
                                    className="h-8 text-xs"
                                    value={mf.label}
                                    onChange={(e) =>
                                        updateMemberField(index, {
                                            label: e.target.value,
                                            // Keep the key following the label
                                            // until the organiser edits it.
                                            key:
                                                mf.key === slugKey(mf.label) ||
                                                /^question(_\d+)?$/.test(mf.key)
                                                    ? slugKey(e.target.value)
                                                    : mf.key,
                                        })
                                    }
                                    placeholder="e.g. Asal Sekolah"
                                />
                            </Field>
                            <Field>
                                <FieldLabel className="text-xs">Key</FieldLabel>
                                <Input
                                    className="h-8 font-mono text-xs"
                                    value={mf.key}
                                    onChange={(e) =>
                                        updateMemberField(index, {
                                            key: e.target.value
                                                .toLowerCase()
                                                .replace(/[^a-z0-9_]/g, '_'),
                                        })
                                    }
                                />
                            </Field>
                            <Field>
                                <FieldLabel className="text-xs">
                                    Type
                                </FieldLabel>
                                <Select
                                    value={mf.type}
                                    onValueChange={(value) =>
                                        updateMemberField(index, {
                                            type: value as RosterMemberFieldType,
                                            options:
                                                value === 'select'
                                                    ? (mf.options ?? [
                                                          'Option 1',
                                                          'Option 2',
                                                      ])
                                                    : undefined,
                                        })
                                    }
                                >
                                    <SelectTrigger className="h-8 w-full text-xs">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {ROSTER_MEMBER_FIELD_TYPES.map((t) => (
                                            <SelectItem
                                                key={t.value}
                                                value={t.value}
                                            >
                                                {t.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </Field>
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                onClick={() => removeMemberField(index)}
                                aria-label="Remove question"
                            >
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </div>
                        <div className="flex items-center gap-2">
                            <Checkbox
                                id={`member-field-required-${index}`}
                                checked={mf.required}
                                onCheckedChange={(checked) =>
                                    updateMemberField(index, {
                                        required: Boolean(checked),
                                    })
                                }
                            />
                            <label
                                htmlFor={`member-field-required-${index}`}
                                className="text-xs"
                            >
                                Required
                            </label>
                        </div>
                        {mf.type === 'select' && (
                            <OptionEditor
                                options={mf.options ?? []}
                                onChange={(options) =>
                                    updateMemberField(index, { options })
                                }
                            />
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}
