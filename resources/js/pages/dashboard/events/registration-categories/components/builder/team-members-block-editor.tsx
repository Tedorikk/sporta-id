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
import type {
    TeamMemberField,
    TeamMemberSlot,
} from '@/types/registration-category';
import { ROSTER_MEMBER_FIELD_TYPES } from '@/types/registration-category';
import { OptionEditor } from './option-editor';

function slugKey(label: string): string {
    return (
        label
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '_')
            .replace(/^_+|_+$/g, '') || 'role'
    );
}

interface TeamMembersBlockEditorProps {
    slots: TeamMemberSlot[];
    memberFields: TeamMemberField[];
    onChange: (patch: {
        slots?: TeamMemberSlot[];
        member_fields?: TeamMemberField[];
    }) => void;
}

/**
 * The non-basketball counterpart to RosterBlockEditor: the organiser types
 * their own role names (e.g. "Dancer") instead of picking from
 * Player/Coach/Manager/Medic/Officer, and there is no jersey number,
 * identity document or "collect on this form" toggle — members are always
 * collected directly.
 */
export function TeamMembersBlockEditor({
    slots,
    memberFields,
    onChange,
}: TeamMembersBlockEditorProps) {
    function updateSlot(index: number, patch: Partial<TeamMemberSlot>) {
        onChange({
            slots: slots.map((s, i) => (i === index ? { ...s, ...patch } : s)),
        });
    }

    function addSlot() {
        const used = new Set(slots.map((s) => s.role));
        let key = 'member';
        let n = 2;

        while (used.has(key)) {
            key = `member_${n++}`;
        }

        onChange({
            slots: [...slots, { role: key, label: 'Member', min: 1, max: null }],
        });
    }

    function removeSlot(index: number) {
        onChange({ slots: slots.filter((_, i) => i !== index) });
    }

    function updateMemberField(index: number, patch: Partial<TeamMemberField>) {
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
            <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-sm font-medium">Roles</p>
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
                        Role
                    </Button>
                </div>

                {slots.length === 0 && (
                    <p className="rounded-md border border-dashed px-3 py-4 text-center text-xs text-muted-foreground">
                        Add at least one role — e.g. 4–10 members.
                    </p>
                )}

                {slots.map((slot, index) => (
                    <div
                        key={index}
                        className="grid grid-cols-[1fr_4rem_4rem_auto] items-end gap-2 rounded-md border bg-background p-2"
                    >
                        <Field>
                            <FieldLabel className="text-xs">
                                Role name
                            </FieldLabel>
                            <Input
                                className="h-8 text-xs"
                                value={slot.label}
                                onChange={(e) =>
                                    updateSlot(index, {
                                        label: e.target.value,
                                        role:
                                            slot.role === slugKey(slot.label) ||
                                            /^member(_\d+)?$/.test(slot.role)
                                                ? slugKey(e.target.value)
                                                : slot.role,
                                    })
                                }
                                placeholder="e.g. Dancer"
                            />
                        </Field>
                        <Field>
                            <FieldLabel className="text-xs">Min</FieldLabel>
                            <Input
                                className="h-8 text-xs"
                                type="number"
                                min={0}
                                value={slot.min}
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
                                value={slot.max ?? ''}
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
                            aria-label="Remove role"
                        >
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    </div>
                ))}
            </div>

            <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-sm font-medium">
                            Extra questions per member
                        </p>
                        <FieldDescription>
                            Every member is always asked for a photo, name and
                            WhatsApp number.
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
                                            key:
                                                mf.key === slugKey(mf.label) ||
                                                /^question(_\d+)?$/.test(mf.key)
                                                    ? slugKey(e.target.value)
                                                    : mf.key,
                                        })
                                    }
                                    placeholder="e.g. Dance style"
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
                                            type: value as TeamMemberField['type'],
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
                                id={`team-member-field-required-${index}`}
                                checked={mf.required}
                                onCheckedChange={(checked) =>
                                    updateMemberField(index, {
                                        required: Boolean(checked),
                                    })
                                }
                            />
                            <label
                                htmlFor={`team-member-field-required-${index}`}
                                className="text-xs"
                            >
                                Required
                            </label>
                        </div>
                        {slots.length > 1 && (
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                                <span className="text-xs text-muted-foreground">
                                    Ask this of:
                                </span>
                                {slots.map((slot) => {
                                    const asked =
                                        !mf.roles ||
                                        mf.roles.length === 0 ||
                                        mf.roles.includes(slot.role);

                                    return (
                                        <label
                                            key={slot.role}
                                            className="flex items-center gap-1.5 text-xs"
                                        >
                                            <Checkbox
                                                checked={asked}
                                                onCheckedChange={(checked) => {
                                                    const current =
                                                        !mf.roles ||
                                                        mf.roles.length === 0
                                                            ? slots.map(
                                                                  (s) => s.role,
                                                              )
                                                            : mf.roles;
                                                    const next = checked
                                                        ? [
                                                              ...current,
                                                              slot.role,
                                                          ]
                                                        : current.filter(
                                                              (r) =>
                                                                  r !==
                                                                  slot.role,
                                                          );
                                                    const unique = Array.from(
                                                        new Set(next),
                                                    );
                                                    updateMemberField(index, {
                                                        roles:
                                                            unique.length >=
                                                            slots.length
                                                                ? undefined
                                                                : unique,
                                                    });
                                                }}
                                            />
                                            {slot.label}
                                        </label>
                                    );
                                })}
                            </div>
                        )}
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
