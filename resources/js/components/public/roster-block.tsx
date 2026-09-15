import { Plus, Trash2 } from 'lucide-react';
import type { CSSProperties } from 'react';
import type { Control, FieldErrors, UseFormSetError } from 'react-hook-form';
import { Controller, useFieldArray } from 'react-hook-form';
import * as z from 'zod';
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
import { UploadDocument } from '@/components/upload-document';
import { UploadImage } from '@/components/upload-image';
import { useT } from '@/hooks/use-t';
import type { Translate } from '@/lib/i18n';
import type { PlayerRole } from '@/types/player';
import type {
    RegistrationField,
    RosterMemberField,
    RosterMemberInput,
} from '@/types/registration-category';
import { emptyRosterMember } from '@/types/registration-category';

const E164 = /^\+[1-9]\d{1,14}$/;
const LOOSE_PHONE = /^[0-9+\-\s()]{6,25}$/;

/**
 * Client-side mirror of RosterService::submissionRules() + assertSubmissionFits():
 * what the server will reject, checked before the visitor leaves the page.
 */
export function rosterSchema(field: RegistrationField, t: Translate) {
    const slots = field.slots ?? [];
    const memberFields = field.member_fields ?? [];

    const member = z
        .object({
            role: z.string(),
            name: z.string(),
            jersey_number: z.string(),
            position: z.string(),
            photo: z.string(),
            identity_card: z.string(),
            birthplace: z.string(),
            dob: z.string(),
            phone_number: z.string(),
            email: z.string(),
            certificate: z.string(),
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
            need('identity_card', t('Upload an identity document'));
            need('birthplace', t('Place of birth is required'));
            need('dob', t('Date of birth is required'));
            need('phone_number', t('WhatsApp number is required'));

            if (m.phone_number.trim() !== '' && !E164.test(m.phone_number)) {
                ctx.addIssue({
                    code: 'custom',
                    path: ['phone_number'],
                    message: t('Use international format, e.g. +628123456789'),
                });
            }

            if (m.role === 'player') {
                need('jersey_number', t('Every player needs a jersey number'));
            }

            if (m.role === 'medic') {
                need(
                    'certificate',
                    t('A medic needs a licence or certificate'),
                );
            }

            memberFields.forEach((mf) => {
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
        slots.forEach((slot) => {
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

        const seen = new Map<string, number>();
        members.forEach((m, index) => {
            if (m.role !== 'player' || m.jersey_number.trim() === '') {
                return;
            }

            const first = seen.get(m.jersey_number);

            if (first !== undefined) {
                [first, index].forEach((i) =>
                    ctx.addIssue({
                        code: 'custom',
                        path: [i, 'jersey_number'],
                        message: t('Two players share this jersey number'),
                    }),
                );
            } else {
                seen.set(m.jersey_number, index);
            }
        });
    });
}

/** One empty entry per required slot, so "Pemain 1..7" are already on the page. */
export function defaultRoster(field: RegistrationField): RosterMemberInput[] {
    return (field.slots ?? []).flatMap((slot) =>
        Array.from({ length: slot.min }, () =>
            emptyRosterMember(slot.role, field.member_fields ?? []),
        ),
    );
}

type RosterErrors = FieldErrors<{ roster: RosterMemberInput[] }>['roster'];

interface RosterBlockProps {
    field: RegistrationField;
    // The page's form has a dynamic shape; the block only ever touches `roster`.
    control: Control<any>;
    errors: RosterErrors;
    setError: UseFormSetError<any>;
    disabled?: boolean;
    controlStyle: CSSProperties;
}

export function RosterBlock({
    field,
    control,
    errors,
    setError,
    disabled,
    controlStyle,
}: RosterBlockProps) {
    const { t } = useT();
    const { fields, append, remove } = useFieldArray({
        control,
        name: 'roster',
    });
    const members = fields as unknown as (RosterMemberInput & {
        id: string;
    })[];
    const slots = field.slots ?? [];
    const memberFields = field.member_fields ?? [];
    const rootMessage = errors?.root?.message ?? errors?.message;

    return (
        <div className="flex flex-col gap-6">
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
                                            emptyRosterMember(
                                                slot.role,
                                                memberFields,
                                            ),
                                        )
                                    }
                                    style={controlStyle}
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
                                    {
                                        role: sectionLabel.toLowerCase(),
                                    },
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
                                role={slot.role}
                                memberFields={memberFields}
                                control={control}
                                errors={errors?.[index]}
                                setError={setError}
                                disabled={disabled}
                                controlStyle={controlStyle}
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
    role,
    memberFields,
    control,
    errors,
    setError,
    disabled,
    controlStyle,
    onRemove,
}: {
    index: number;
    title: string;
    role: PlayerRole;
    memberFields: RosterMemberField[];
    control: Control<any>;
    errors: NonNullable<RosterErrors>[number] | undefined;
    setError: UseFormSetError<any>;
    disabled?: boolean;
    controlStyle: CSSProperties;
    onRemove?: () => void;
}) {
    const { t } = useT();
    const base = `roster.${index}`;
    const isPlayer = role === 'player';
    const isMedic = role === 'medic';

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
                        <Field
                            data-invalid={Boolean(errors?.photo)}
                            className="w-28"
                        >
                            <FieldLabel>{t('Photo')}</FieldLabel>
                            <UploadImage
                                value={field.value as string}
                                ratio={4 / 5}
                                uploadUrl="/public-upload/image"
                                deleteUrl="/public-upload/image"
                                onChange={(value) =>
                                    field.onChange(value ?? '')
                                }
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
                                </FieldLabel>
                                <Input
                                    {...field}
                                    id={`${base}.name`}
                                    autoComplete="off"
                                    disabled={disabled}
                                    style={controlStyle}
                                />
                                {fieldState.invalid && (
                                    <FieldError errors={[fieldState.error]} />
                                )}
                            </Field>
                        )}
                    />

                    {isPlayer && (
                        <div className="grid grid-cols-2 gap-3">
                            <Controller
                                name={`${base}.jersey_number`}
                                control={control}
                                render={({ field, fieldState }) => (
                                    <Field data-invalid={fieldState.invalid}>
                                        <FieldLabel
                                            htmlFor={`${base}.jersey_number`}
                                        >
                                            {t('Jersey no.')}
                                        </FieldLabel>
                                        <Input
                                            {...field}
                                            id={`${base}.jersey_number`}
                                            inputMode="numeric"
                                            maxLength={3}
                                            disabled={disabled}
                                            style={controlStyle}
                                        />
                                        {fieldState.invalid && (
                                            <FieldError
                                                errors={[fieldState.error]}
                                            />
                                        )}
                                    </Field>
                                )}
                            />
                            <Controller
                                name={`${base}.position`}
                                control={control}
                                render={({ field }) => (
                                    <Field>
                                        <FieldLabel
                                            htmlFor={`${base}.position`}
                                        >
                                            {t('Position')}{' '}
                                            <span className="font-normal text-muted-foreground">
                                                {t('(Optional)')}
                                            </span>
                                        </FieldLabel>
                                        <Input
                                            {...field}
                                            id={`${base}.position`}
                                            placeholder="PG, SG, SF, PF, C"
                                            disabled={disabled}
                                            style={controlStyle}
                                        />
                                    </Field>
                                )}
                            />
                        </div>
                    )}
                </FieldGroup>
            </div>

            <div className="grid grid-cols-2 gap-3">
                <Controller
                    name={`${base}.birthplace`}
                    control={control}
                    render={({ field, fieldState }) => (
                        <Field data-invalid={fieldState.invalid}>
                            <FieldLabel htmlFor={`${base}.birthplace`}>
                                {t('Place of birth')}
                            </FieldLabel>
                            <Input
                                {...field}
                                id={`${base}.birthplace`}
                                disabled={disabled}
                                style={controlStyle}
                            />
                            {fieldState.invalid && (
                                <FieldError errors={[fieldState.error]} />
                            )}
                        </Field>
                    )}
                />
                <Controller
                    name={`${base}.dob`}
                    control={control}
                    render={({ field, fieldState }) => (
                        <Field data-invalid={fieldState.invalid}>
                            <FieldLabel htmlFor={`${base}.dob`}>
                                {t('Date of birth')}
                            </FieldLabel>
                            <Input
                                {...field}
                                id={`${base}.dob`}
                                type="date"
                                disabled={disabled}
                                style={controlStyle}
                            />
                            {fieldState.invalid && (
                                <FieldError errors={[fieldState.error]} />
                            )}
                        </Field>
                    )}
                />
            </div>

            <Controller
                name={`${base}.phone_number`}
                control={control}
                render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                        <FieldLabel htmlFor={`${base}.phone_number`}>
                            {t('WhatsApp number')}
                        </FieldLabel>
                        <Input
                            {...field}
                            id={`${base}.phone_number`}
                            type="tel"
                            placeholder="+628123456789"
                            disabled={disabled}
                            style={controlStyle}
                        />
                        {fieldState.invalid ? (
                            <FieldError errors={[fieldState.error]} />
                        ) : (
                            <FieldDescription>
                                Include the country code, e.g. +62.
                            </FieldDescription>
                        )}
                    </Field>
                )}
            />

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
                                                style={controlStyle}
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
                                            style={controlStyle}
                                        />
                                    )}
                                    {fieldState.invalid && (
                                        <FieldError
                                            errors={[fieldState.error]}
                                        />
                                    )}
                                </Field>
                            )}
                        />
                    ))}
                </div>
            )}

            <Controller
                name={`${base}.identity_card`}
                control={control}
                render={({ field }) => (
                    <Field data-invalid={Boolean(errors?.identity_card)}>
                        <FieldLabel>{t('Identity document')}</FieldLabel>
                        <FieldDescription>
                            A clear photo of the KTP, KK or birth certificate.
                        </FieldDescription>
                        <UploadImage
                            value={field.value as string}
                            ratio={16 / 10}
                            uploadUrl="/public-upload/image"
                            deleteUrl="/public-upload/image"
                            onChange={(value) => field.onChange(value ?? '')}
                            onError={uploadError('identity_card')}
                            disabled={disabled}
                            className="rounded-2xl border-2 border-black"
                            placeholder={t('Upload identity document')}
                        />
                        {errors?.identity_card?.message && (
                            <FieldError>
                                {errors.identity_card.message}
                            </FieldError>
                        )}
                    </Field>
                )}
            />

            {isMedic && (
                <Controller
                    name={`${base}.certificate`}
                    control={control}
                    render={({ field }) => (
                        <Field data-invalid={Boolean(errors?.certificate)}>
                            <FieldLabel>
                                {t('Medic licence / certificate')}
                            </FieldLabel>
                            <UploadDocument
                                value={field.value as string}
                                uploadUrl="/public-upload/document"
                                deleteUrl="/public-upload/document"
                                onChange={(value) =>
                                    field.onChange(value ?? '')
                                }
                                onError={uploadError('certificate')}
                                disabled={disabled}
                            />
                            {errors?.certificate?.message && (
                                <FieldError>
                                    {errors.certificate.message}
                                </FieldError>
                            )}
                        </Field>
                    )}
                />
            )}
        </div>
    );
}
