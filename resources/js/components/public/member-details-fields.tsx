import { RequiredMark } from '@/components/public/required-mark';
import {
    Field,
    FieldDescription,
    FieldError,
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
import type { Player, PlayerRole } from '@/types/player';
import type { RosterMemberField } from '@/types/registration-category';
import { memberFieldAppliesTo } from '@/types/registration-category';

/** What both member forms edit; mirrors RosterService::rules(). */
export type MemberForm = {
    name: string;
    role: PlayerRole;
    jersey_number: string;
    position: string;
    photo: string;
    identity_card: string;
    birthplace: string;
    dob: string;
    phone_number: string;
    email: string;
    certificate: string;
    extra: Record<string, string>;
};

export function toMemberForm(
    member: Player | undefined,
    memberFields: RosterMemberField[],
): MemberForm {
    return {
        name: member?.name ?? '',
        role: member?.role ?? 'player',
        jersey_number: member?.jersey_number ?? '',
        position: member?.position ?? '',
        photo: member?.photo ?? '',
        identity_card: member?.identity_card ?? '',
        birthplace: member?.birthplace ?? '',
        dob: member?.dob?.slice(0, 10) ?? '',
        phone_number: member?.phone_number ?? '',
        email: member?.email ?? '',
        certificate: member?.certificate ?? '',
        extra: Object.fromEntries(
            memberFields.map((f) => [f.key, member?.extra?.[f.key] ?? '']),
        ),
    };
}

export type MemberFormErrors = Partial<Record<string, string>>;

interface MemberDetailsProps {
    data: MemberForm;
    setData: <K extends keyof MemberForm>(key: K, value: MemberForm[K]) => void;
    errors: MemberFormErrors;
    processing: boolean;
    memberFields: RosterMemberField[];
}

/**
 * The details every tournament entry needs — photo, birth details, WhatsApp
 * number, the organiser's extra questions, identity document, and a medic's
 * certificate. Shared by the manager's portal dialog and a member's own
 * self-fill page, so what "complete" asks for is rendered once. Validation
 * lives on the server (RosterService); this only shows what comes back.
 */
export function MemberDetailsFields({
    data,
    setData,
    errors,
    processing,
    memberFields,
}: MemberDetailsProps) {
    const { t } = useT();
    const isMedic = data.role === 'medic';
    // Only the extra questions the organiser aimed at this member's role.
    const askedFields = memberFields.filter((mf) =>
        memberFieldAppliesTo(mf, data.role),
    );

    return (
        <>
            <Field data-invalid={Boolean(errors.photo)} className="w-44">
                <FieldLabel>
                    {t('Photo')}
                    <RequiredMark />
                </FieldLabel>
                <UploadImage
                    ratio={4 / 5}
                    value={data.photo}
                    uploadUrl="/public-upload/image"
                    deleteUrl="/public-upload/image"
                    onChange={(value) => setData('photo', value ?? '')}
                    enableCrop
                    disabled={processing}
                    className="rounded-xl border"
                />
                {errors.photo && <FieldError>{errors.photo}</FieldError>}
            </Field>
            <div className="grid grid-cols-2 gap-3">
                <Field data-invalid={Boolean(errors.birthplace)}>
                    <FieldLabel htmlFor="member_birthplace">
                        {t('Place of birth')}
                        <RequiredMark />
                    </FieldLabel>
                    <Input
                        id="member_birthplace"
                        value={data.birthplace}
                        onChange={(e) => setData('birthplace', e.target.value)}
                        disabled={processing}
                    />
                    {errors.birthplace && (
                        <FieldError>{errors.birthplace}</FieldError>
                    )}
                </Field>
                <Field data-invalid={Boolean(errors.dob)}>
                    <FieldLabel htmlFor="member_dob">
                        {t('Date of birth')}
                        <RequiredMark />
                    </FieldLabel>
                    <Input
                        id="member_dob"
                        type="date"
                        value={data.dob}
                        onChange={(e) => setData('dob', e.target.value)}
                        disabled={processing}
                    />
                    {errors.dob && <FieldError>{errors.dob}</FieldError>}
                </Field>
            </div>

            <div className="grid grid-cols-2 gap-3">
                <Field data-invalid={Boolean(errors.phone_number)}>
                    <FieldLabel htmlFor="member_phone">
                        {t('WhatsApp number')}
                        <RequiredMark />
                    </FieldLabel>
                    <Input
                        id="member_phone"
                        type="tel"
                        placeholder="+628123456789"
                        value={data.phone_number}
                        onChange={(e) =>
                            setData('phone_number', e.target.value)
                        }
                        disabled={processing}
                    />
                    {errors.phone_number ? (
                        <FieldError>{errors.phone_number}</FieldError>
                    ) : (
                        <FieldDescription>
                            {t('Include the country code, e.g. +62.')}
                        </FieldDescription>
                    )}
                </Field>
                <Field data-invalid={Boolean(errors.email)}>
                    <FieldLabel htmlFor="member_email">
                        {t('Email')}{' '}
                        <span className="font-normal text-muted-foreground">
                            {t('(Optional)')}
                        </span>
                    </FieldLabel>
                    <Input
                        id="member_email"
                        type="email"
                        value={data.email}
                        onChange={(e) => setData('email', e.target.value)}
                        disabled={processing}
                    />
                    {errors.email && <FieldError>{errors.email}</FieldError>}
                </Field>
            </div>

            {askedFields.length > 0 && (
                <div className="grid grid-cols-2 gap-3">
                    {askedFields.map((mf) => {
                        const error = (
                            errors as Record<string, string | undefined>
                        )[`extra.${mf.key}`];

                        return (
                            <Field key={mf.key} data-invalid={Boolean(error)}>
                                <FieldLabel htmlFor={`member_extra_${mf.key}`}>
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
                                        value={data.extra[mf.key] ?? ''}
                                        onValueChange={(value) =>
                                            setData('extra', {
                                                ...data.extra,
                                                [mf.key]: value,
                                            })
                                        }
                                        disabled={processing}
                                    >
                                        <SelectTrigger
                                            id={`member_extra_${mf.key}`}
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
                                        id={`member_extra_${mf.key}`}
                                        type={
                                            mf.type === 'number'
                                                ? 'number'
                                                : mf.type === 'date'
                                                  ? 'date'
                                                  : mf.type === 'phone'
                                                    ? 'tel'
                                                    : 'text'
                                        }
                                        value={data.extra[mf.key] ?? ''}
                                        onChange={(e) =>
                                            setData('extra', {
                                                ...data.extra,
                                                [mf.key]: e.target.value,
                                            })
                                        }
                                        disabled={processing}
                                    />
                                )}
                                {error && <FieldError>{error}</FieldError>}
                            </Field>
                        );
                    })}
                </div>
            )}

            <Field data-invalid={Boolean(errors.identity_card)}>
                <FieldLabel>
                    {t('Identity document')}
                    <RequiredMark />
                </FieldLabel>
                <FieldDescription>
                    {t('A clear photo of the KTP, KK or birth certificate.')}
                </FieldDescription>
                <UploadImage
                    ratio={16 / 10}
                    value={data.identity_card}
                    uploadUrl="/public-upload/image"
                    deleteUrl="/public-upload/image"
                    onChange={(value) => setData('identity_card', value ?? '')}
                    disabled={processing}
                    className="rounded-xl border"
                    placeholder={t('Upload identity document')}
                />
                {errors.identity_card && (
                    <FieldError>{errors.identity_card}</FieldError>
                )}
            </Field>

            {isMedic && (
                <Field data-invalid={Boolean(errors.certificate)}>
                    <FieldLabel>
                        {t('Medic certificate')}{' '}
                        <span className="font-normal text-muted-foreground">
                            {t('(Optional)')}
                        </span>
                    </FieldLabel>
                    <UploadDocument
                        value={data.certificate}
                        uploadUrl="/public-upload/document"
                        deleteUrl="/public-upload/document"
                        onChange={(value) =>
                            setData('certificate', value ?? '')
                        }
                        disabled={processing}
                    />
                    {errors.certificate && (
                        <FieldError>{errors.certificate}</FieldError>
                    )}
                </Field>
            )}
        </>
    );
}
