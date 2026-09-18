import { Plus, Trash2 } from 'lucide-react';
import type { Control, FieldErrors, UseFormSetError } from 'react-hook-form';
import { Controller, useFieldArray } from 'react-hook-form';
import * as z from 'zod';
import { RequiredMark } from '@/components/public/required-mark';
import { Button } from '@/components/ui/button';
import {
    Field,
    FieldDescription,
    FieldError,
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
import { UploadImage } from '@/components/upload-image';
import { useT } from '@/hooks/use-t';
import type { Translate } from '@/lib/i18n';
import type {
    RegistrationField,
    TeamMemberField,
    TeamMemberInput,
} from '@/types/registration-category';
import {
    emptyTeamMember,
    teamMemberFieldAppliesTo,
} from '@/types/registration-category';

const E164 = /^\+[1-9]\d{1,14}$/;
const LOOSE_PHONE = /^[0-9+\-\s()]{6,25}$/;

/**
 * The non-basketball counterpart to roster-block.tsx's rosterSchema(). No
 * jersey number, identity document or birth details — just a name, role,
 * photo and WhatsApp number, plus the organiser's own questions.
 */
export function teamMembersSchema(field: RegistrationField, t: Translate) {
    const memberFields = field.member_fields ?? [];

    const member = z
        .object({
            role: z.string(),
            name: z.string(),
            photo: z.string(),
            phone_number: z.string(),
            email: z.string(),
            extra: z.record(z.string(), z.string()),
        })
        .superRefine((m, ctx) => {
            const need = (key: keyof typeof m, message: string) => {
                if (typeof m[key] === 'string' && m[key].trim() === '') {
                    ctx.addIssue({ code: 'custom', path: [key], message });
                }
            };

            need('name', t('Name is required'));
            need('photo', t('Upload a photo for the ID card'));
            need('phone_number', t('WhatsApp number is required'));

            if (m.phone_number.trim() !== '' && !E164.test(m.phone_number)) {
                ctx.addIssue({
                    code: 'custom',
                    path: ['phone_number'],
                    message: t('Use international format, e.g. +628123456789'),
                });
            }

            memberFields.forEach((mf) => {
                if (!teamMemberFieldAppliesTo(mf, m.role)) {
                    return;
                }

                const value = m.extra[mf.key] ?? '';

                if (mf.required && value.trim() === '') {
                    ctx.addIssue({
                        code: 'custom',
                        path: ['extra', mf.key],
                        message: t(':label is required', { label: mf.label }),
                    });
                } else if (
                    mf.type === 'phone' &&
                    value.trim() !== '' &&
                    !LOOSE_PHONE.test(value)
                ) {
                    ctx.addIssue({
                        code: 'custom',
                        path: ['extra', mf.key],
                        message: t('Must be a valid phone number'),
                    });
                }
            });
        });

    return z.array(member).superRefine((members, ctx) => {
        (field.slots ?? []).forEach((slot) => {
            const count = members.filter((m) => m.role === slot.role).length;

            if (count < slot.min) {
                ctx.addIssue({
                    code: 'custom',
                    message: t('At least :min :label required', {
                        min: slot.min,
                        label: slot.label,
                    }),
                });
            }
        });
    });
}

/** One empty entry per required slot, so the minimum members are already on the page. */
export function defaultTeamMembers(field: RegistrationField): TeamMemberInput[] {
    return (field.slots ?? []).flatMap((slot) =>
        Array.from({ length: slot.min }, () =>
            emptyTeamMember(slot.role, (field.member_fields ?? []) as TeamMemberField[]),
        ),
    );
}

type MemberErrors = FieldErrors<{ members: TeamMemberInput[] }>['members'];

interface TeamMembersBlockProps {
    field: RegistrationField;
    // The page's form has a dynamic shape; the block only ever touches `members`.
    control: Control<any>;
    errors: MemberErrors;
    setError: UseFormSetError<any>;
    disabled?: boolean;
}

export function TeamMembersBlock({
    field,
    control,
    errors,
    setError,
    disabled,
}: TeamMembersBlockProps) {
    const { t } = useT();
    const { fields, append, remove } = useFieldArray({ control, name: 'members' });
    const members = fields as unknown as (TeamMemberInput & { id: string })[];
    const slots = field.slots ?? [];
    const memberFields = (field.member_fields ?? []) as TeamMemberField[];
    const rootMessage = errors?.root?.message ?? errors?.message;

    return (
        <div id="members" className="flex flex-col gap-6">
            {field.help_text && (
                <FieldDescription>{field.help_text}</FieldDescription>
            )}

            {typeof rootMessage === 'string' && (
                <FieldError>{rootMessage}</FieldError>
            )}

            {slots.map((slot) => {
                const entries = members
                    .map((m, index) => ({ m, index }))
                    .filter(({ m }) => m.role === slot.role);
                const canAdd = slot.max === null || entries.length < slot.max;
                const canRemove = entries.length > slot.min;
                const sectionLabel = t(slot.label);

                return (
                    <section key={slot.role} className="flex flex-col gap-3">
                        <div className="flex items-center justify-between">
                            <h3 className="text-sm font-bold tracking-wide uppercase">
                                {sectionLabel}
                                <span className="ml-2 font-normal text-muted-foreground normal-case">
                                    {slot.min === slot.max
                                        ? slot.min
                                        : slot.max === null
                                          ? t('min. :min', { min: slot.min })
                                          : `${slot.min}–${slot.max}`}
                                </span>
                            </h3>
                            {canAdd && (
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    disabled={disabled}
                                    onClick={() =>
                                        append(
                                            emptyTeamMember(
                                                slot.role,
                                                memberFields,
                                            ),
                                        )
                                    }
                                >
                                    <Plus className="mr-1.5 h-3.5 w-3.5" />
                                    {sectionLabel}
                                </Button>
                            )}
                        </div>

                        {entries.length === 0 && (
                            <p className="rounded-xl border border-dashed px-4 py-4 text-center text-xs text-muted-foreground">
                                {t(
                                    'Optional — add one if the team has a :role.',
                                    { role: sectionLabel.toLowerCase() },
                                )}
                            </p>
                        )}

                        {entries.map(({ m, index }, position) => (
                            <MemberCard
                                key={m.id}
                                index={index}
                                title={
                                    entries.length > 1 || slot.max !== 1
                                        ? `${sectionLabel} ${position + 1}`
                                        : sectionLabel
                                }
                                memberFields={memberFields}
                                control={control}
                                errors={errors?.[index]}
                                setError={setError}
                                disabled={disabled}
                                onRemove={
                                    canRemove ? () => remove(index) : undefined
                                }
                            />
                        ))}
                    </section>
                );
            })}
        </div>
    );
}

function MemberCard({
    index,
    title,
    memberFields,
    control,
    errors,
    setError,
    disabled,
    onRemove,
}: {
    index: number;
    title: string;
    memberFields: TeamMemberField[];
    control: Control<any>;
    errors: NonNullable<MemberErrors>[number] | undefined;
    setError: UseFormSetError<any>;
    disabled?: boolean;
    onRemove?: () => void;
}) {
    const { t } = useT();
    const base = `members.${index}`;

    const uploadError = (name: string) => (error: unknown) =>
        setError(`${base}.${name}`, {
            type: 'manual',
            message: typeof error === 'string' ? error : t('Upload failed'),
        });

    return (
        <div className="flex flex-col gap-4 rounded-2xl border-2 border-black/10 p-4">
            <div className="flex items-center justify-between">
                <p className="font-semibold">{title}</p>
                {onRemove && (
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive"
                        onClick={onRemove}
                        disabled={disabled}
                        aria-label={t('Remove :title', { title })}
                    >
                        <Trash2 className="h-4 w-4" />
                    </Button>
                )}
            </div>

            <div className="grid grid-cols-[7rem_1fr] gap-4">
                <Controller
                    name={`${base}.photo`}
                    control={control}
                    render={({ field }) => (
                        <Field data-invalid={Boolean(errors?.photo)} className="w-28">
                            <FieldLabel>
                                {t('Photo')}
                                <RequiredMark />
                            </FieldLabel>
                            <UploadImage
                                value={field.value as string}
                                ratio={4 / 5}
                                uploadUrl="/public-upload/image"
                                deleteUrl="/public-upload/image"
                                onChange={(value) => field.onChange(value ?? '')}
                                onError={uploadError('photo')}
                                enableCrop
                                disabled={disabled}
                                className="rounded-2xl border-2 border-black"
                            />
                            {errors?.photo?.message && (
                                <FieldError>{errors.photo.message}</FieldError>
                            )}
                        </Field>
                    )}
                />

                <FieldGroup>
                    <Controller
                        name={`${base}.name`}
                        control={control}
                        render={({ field, fieldState }) => (
                            <Field data-invalid={fieldState.invalid}>
                                <FieldLabel htmlFor={`${base}.name`}>
                                    {t('Full name')}
                                    <RequiredMark />
                                </FieldLabel>
                                <Input
                                    {...field}
                                    id={`${base}.name`}
                                    autoComplete="off"
                                    disabled={disabled}
                                />
                                {fieldState.invalid && (
                                    <FieldError errors={[fieldState.error]} />
                                )}
                            </Field>
                        )}
                    />

                    <Controller
                        name={`${base}.phone_number`}
                        control={control}
                        render={({ field, fieldState }) => (
                            <Field data-invalid={fieldState.invalid}>
                                <FieldLabel htmlFor={`${base}.phone_number`}>
                                    {t('WhatsApp number')}
                                    <RequiredMark />
                                </FieldLabel>
                                <Input
                                    {...field}
                                    id={`${base}.phone_number`}
                                    type="tel"
                                    placeholder="+628123456789"
                                    disabled={disabled}
                                />
                                {fieldState.invalid ? (
                                    <FieldError errors={[fieldState.error]} />
                                ) : (
                                    <FieldDescription>
                                        {t('Include the country code, e.g. +62.')}
                                    </FieldDescription>
                                )}
                            </Field>
                        )}
                    />
                </FieldGroup>
            </div>

            {memberFields.length > 0 && (
                <div className="grid grid-cols-2 gap-3">
                    {memberFields.map((mf) => (
                        <Controller
                            key={mf.key}
                            name={`${base}.extra.${mf.key}`}
                            control={control}
                            render={({ field, fieldState }) => (
                                <Field data-invalid={fieldState.invalid}>
                                    <FieldLabel htmlFor={`${base}.${mf.key}`}>
                                        {mf.label}
                                        {mf.required && <RequiredMark />}
                                        {!mf.required && (
                                            <span className="font-normal text-muted-foreground">
                                                {' '}
                                                {t('(Optional)')}
                                            </span>
                                        )}
                                    </FieldLabel>
                                    {mf.type === 'select' ? (
                                        <Select
                                            value={field.value as string}
                                            onValueChange={field.onChange}
                                            disabled={disabled}
                                        >
                                            <SelectTrigger
                                                id={`${base}.${mf.key}`}
                                                className="w-full"
                                            >
                                                <SelectValue
                                                    placeholder={t('Choose…')}
                                                />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {(mf.options ?? []).map(
                                                    (option) => (
                                                        <SelectItem
                                                            key={option}
                                                            value={option}
                                                        >
                                                            {option}
                                                        </SelectItem>
                                                    ),
                                                )}
                                            </SelectContent>
                                        </Select>
                                    ) : (
                                        <Input
                                            {...field}
                                            id={`${base}.${mf.key}`}
                                            type={
                                                mf.type === 'number'
                                                    ? 'number'
                                                    : mf.type === 'date'
                                                      ? 'date'
                                                      : mf.type === 'phone'
                                                        ? 'tel'
                                                        : 'text'
                                            }
                                            disabled={disabled}
                                        />
                                    )}
                                    {fieldState.invalid && (
                                        <FieldError errors={[fieldState.error]} />
                                    )}
                                </Field>
                            )}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
