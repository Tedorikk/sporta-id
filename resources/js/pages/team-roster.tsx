import { Head, useForm, usePage } from '@inertiajs/react';
import {
    Clock,
    IdCard,
    Loader2,
    Lock,
    Pencil,
    Plus,
    Trash2,
    UserRound,
} from 'lucide-react';
import type { CSSProperties } from 'react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { PublicPageHeader } from '@/components/public/public-page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
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
import { useForceLightMode } from '@/hooks/use-force-light-mode';
import { useT } from '@/hooks/use-t';
import { accentColors } from '@/lib/color';
import { formatDateTime } from '@/lib/format-date';
import type { Event } from '@/types/event';
import type { Player, PlayerRole } from '@/types/player';
import { PLAYER_ROLES, playerRoleLabel } from '@/types/player';
import type { RosterMemberField } from '@/types/registration-category';

interface Limits {
    players: number;
    staff: number;
    min_players: number | null;
    max_players: number | null;
    complete: boolean;
    closes_at: string | null;
}

/** Mirrors TeamRosterController::lockReason(). */
type LockReason = 'payment_pending' | 'withdrawn' | 'verified' | 'closed';

interface Props {
    registration: { qr_token: string; status: string; name: string };
    event: Event;
    registrationCategory: { id: number; name: string };
    team: { id: number; name: string; logo: string | null; status: string };
    members: Player[];
    /** The organiser's extra per-member questions from the form's roster block. */
    memberFields: RosterMemberField[];
    limits: Limits;
    lock: LockReason | null;
}

const LOCK_COPY: Record<LockReason, { title: string; description: string }> = {
    payment_pending: {
        title: 'Complete payment first',
        description:
            'The roster opens once the registration fee is settled. Use the link in your confirmation to pay.',
    },
    withdrawn: {
        title: 'Registration withdrawn',
        description:
            'This registration is no longer active, so the roster can’t be changed. Contact the organiser if this is unexpected.',
    },
    verified: {
        title: 'Roster verified',
        description:
            'The organiser has reviewed and approved this team sheet. Contact them for any further changes.',
    },
    closed: {
        title: 'Roster deadline passed',
        description:
            'Roster changes closed. Contact the organiser if something still needs fixing.',
    },
};

type MemberForm = {
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

function toForm(
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

/**
 * Add/edit form for one roster member. Validation lives on the server
 * (RosterService) so the same rules gate the organiser's form; this only
 * shows what comes back.
 */
function MemberDialog({
    token,
    member,
    memberFields,
    open,
    onOpenChange,
}: {
    token: string;
    member: Player | null;
    memberFields: RosterMemberField[];
    open: boolean;
    onOpenChange: (open: boolean) => void;
}) {
    const { t } = useT();
    const isEditing = member !== null;
    // Mounted with a `key` per member (see TeamRoster), so the initial values
    // here are always the right member's; closing just rolls back to them.
    const form = useForm<MemberForm>(toForm(member ?? undefined, memberFields));
    const { data, setData, errors, processing, reset, clearErrors } = form;

    function handleOpenChange(next: boolean) {
        if (!next) {
            reset();
            clearErrors();
        }

        onOpenChange(next);
    }

    const isPlayer = data.role === 'player';
    const isMedic = data.role === 'medic';

    function submit(e: React.FormEvent) {
        e.preventDefault();

        const payload = {
            ...data,
            jersey_number: isPlayer ? data.jersey_number : null,
            position: isPlayer ? data.position || null : null,
            email: data.email || null,
            certificate: isMedic ? data.certificate : null,
        };
        const options = {
            preserveScroll: true,
            onSuccess: () => handleOpenChange(false),
        };

        form.transform(() => payload);

        if (isEditing) {
            form.put(
                `/registrations/${token}/roster/players/${member.id}`,
                options,
            );
        } else {
            form.post(`/registrations/${token}/roster/players`, options);
        }
    }

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
                <form onSubmit={submit}>
                    <DialogHeader>
                        <DialogTitle>
                            {isEditing
                                ? t('Edit :name', { name: member.name })
                                : t('Add member')}
                        </DialogTitle>
                        <DialogDescription>
                            {t(
                                'Every member needs an identity document and a photo for their ID card.',
                            )}
                        </DialogDescription>
                    </DialogHeader>

                    <FieldGroup className="py-4">
                        <div className="grid grid-cols-[8rem_1fr] gap-4">
                            <Field
                                data-invalid={Boolean(errors.photo)}
                                className="w-32"
                            >
                                <FieldLabel>{t('Photo')}</FieldLabel>
                                <UploadImage
                                    ratio={4 / 5}
                                    value={data.photo}
                                    uploadUrl="/public-upload/image"
                                    deleteUrl="/public-upload/image"
                                    onChange={(value) =>
                                        setData('photo', value ?? '')
                                    }
                                    enableCrop
                                    disabled={processing}
                                    className="rounded-xl border"
                                />
                                {errors.photo && (
                                    <FieldError>{errors.photo}</FieldError>
                                )}
                            </Field>

                            <FieldGroup>
                                <Field data-invalid={Boolean(errors.role)}>
                                    <FieldLabel htmlFor="member_role">
                                        {t('Role')}
                                    </FieldLabel>
                                    <Select
                                        value={data.role}
                                        onValueChange={(value) =>
                                            setData('role', value as PlayerRole)
                                        }
                                        disabled={processing}
                                    >
                                        <SelectTrigger
                                            id="member_role"
                                            className="w-full"
                                        >
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {PLAYER_ROLES.map((role) => (
                                                <SelectItem
                                                    key={role.value}
                                                    value={role.value}
                                                >
                                                    {t(role.label)}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    {errors.role && (
                                        <FieldError>{errors.role}</FieldError>
                                    )}
                                </Field>

                                <Field data-invalid={Boolean(errors.name)}>
                                    <FieldLabel htmlFor="member_name">
                                        {t('Full name')}
                                    </FieldLabel>
                                    <Input
                                        id="member_name"
                                        value={data.name}
                                        onChange={(e) =>
                                            setData('name', e.target.value)
                                        }
                                        autoComplete="name"
                                        disabled={processing}
                                    />
                                    {errors.name && (
                                        <FieldError>{errors.name}</FieldError>
                                    )}
                                </Field>
                            </FieldGroup>
                        </div>

                        {isPlayer && (
                            <div className="grid grid-cols-2 gap-3">
                                <Field
                                    data-invalid={Boolean(errors.jersey_number)}
                                >
                                    <FieldLabel htmlFor="member_jersey">
                                        {t('Jersey number')}
                                    </FieldLabel>
                                    <Input
                                        id="member_jersey"
                                        inputMode="numeric"
                                        maxLength={3}
                                        value={data.jersey_number}
                                        onChange={(e) =>
                                            setData(
                                                'jersey_number',
                                                e.target.value,
                                            )
                                        }
                                        disabled={processing}
                                    />
                                    {errors.jersey_number && (
                                        <FieldError>
                                            {errors.jersey_number}
                                        </FieldError>
                                    )}
                                </Field>
                                <Field data-invalid={Boolean(errors.position)}>
                                    <FieldLabel htmlFor="member_position">
                                        {t('Position')}{' '}
                                        <span className="font-normal text-muted-foreground">
                                            {t('(Optional)')}
                                        </span>
                                    </FieldLabel>
                                    <Input
                                        id="member_position"
                                        placeholder="PG, SG, SF, PF, C"
                                        value={data.position}
                                        onChange={(e) =>
                                            setData('position', e.target.value)
                                        }
                                        disabled={processing}
                                    />
                                </Field>
                            </div>
                        )}

                        <div className="grid grid-cols-2 gap-3">
                            <Field data-invalid={Boolean(errors.birthplace)}>
                                <FieldLabel htmlFor="member_birthplace">
                                    {t('Place of birth')}
                                </FieldLabel>
                                <Input
                                    id="member_birthplace"
                                    value={data.birthplace}
                                    onChange={(e) =>
                                        setData('birthplace', e.target.value)
                                    }
                                    disabled={processing}
                                />
                                {errors.birthplace && (
                                    <FieldError>{errors.birthplace}</FieldError>
                                )}
                            </Field>
                            <Field data-invalid={Boolean(errors.dob)}>
                                <FieldLabel htmlFor="member_dob">
                                    {t('Date of birth')}
                                </FieldLabel>
                                <Input
                                    id="member_dob"
                                    type="date"
                                    value={data.dob}
                                    onChange={(e) =>
                                        setData('dob', e.target.value)
                                    }
                                    disabled={processing}
                                />
                                {errors.dob && (
                                    <FieldError>{errors.dob}</FieldError>
                                )}
                            </Field>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <Field data-invalid={Boolean(errors.phone_number)}>
                                <FieldLabel htmlFor="member_phone">
                                    {t('WhatsApp number')}
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
                                    <FieldError>
                                        {errors.phone_number}
                                    </FieldError>
                                ) : (
                                    <FieldDescription>
                                        {t(
                                            'Include the country code, e.g. +62.',
                                        )}
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
                                    onChange={(e) =>
                                        setData('email', e.target.value)
                                    }
                                    disabled={processing}
                                />
                                {errors.email && (
                                    <FieldError>{errors.email}</FieldError>
                                )}
                            </Field>
                        </div>

                        {memberFields.length > 0 && (
                            <div className="grid grid-cols-2 gap-3">
                                {memberFields.map((mf) => {
                                    const error = (
                                        errors as Record<
                                            string,
                                            string | undefined
                                        >
                                    )[`extra.${mf.key}`];

                                    return (
                                        <Field
                                            key={mf.key}
                                            data-invalid={Boolean(error)}
                                        >
                                            <FieldLabel
                                                htmlFor={`member_extra_${mf.key}`}
                                            >
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
                                                    value={
                                                        data.extra[mf.key] ?? ''
                                                    }
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
                                                            placeholder={t(
                                                                'Choose…',
                                                            )}
                                                        />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {(mf.options ?? []).map(
                                                            (option) => (
                                                                <SelectItem
                                                                    key={option}
                                                                    value={
                                                                        option
                                                                    }
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
                                                              : mf.type ===
                                                                  'phone'
                                                                ? 'tel'
                                                                : 'text'
                                                    }
                                                    value={
                                                        data.extra[mf.key] ?? ''
                                                    }
                                                    onChange={(e) =>
                                                        setData('extra', {
                                                            ...data.extra,
                                                            [mf.key]:
                                                                e.target.value,
                                                        })
                                                    }
                                                    disabled={processing}
                                                />
                                            )}
                                            {error && (
                                                <FieldError>{error}</FieldError>
                                            )}
                                        </Field>
                                    );
                                })}
                            </div>
                        )}

                        <Field data-invalid={Boolean(errors.identity_card)}>
                            <FieldLabel>{t('Identity document')}</FieldLabel>
                            <FieldDescription>
                                {t(
                                    'A clear photo of the KTP, KK or birth certificate.',
                                )}
                            </FieldDescription>
                            <UploadImage
                                ratio={16 / 10}
                                value={data.identity_card}
                                uploadUrl="/public-upload/image"
                                deleteUrl="/public-upload/image"
                                onChange={(value) =>
                                    setData('identity_card', value ?? '')
                                }
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
                                    {t('Medic certificate')}
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
                                    <FieldError>
                                        {errors.certificate}
                                    </FieldError>
                                )}
                            </Field>
                        )}
                    </FieldGroup>

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => handleOpenChange(false)}
                            disabled={processing}
                        >
                            {t('Cancel')}
                        </Button>
                        <Button type="submit" disabled={processing}>
                            {processing && (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            )}
                            {isEditing ? t('Save changes') : t('Add to roster')}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

function MemberRow({
    member,
    editable,
    onEdit,
    onRemove,
}: {
    member: Player;
    editable: boolean;
    onEdit: () => void;
    onRemove: () => void;
}) {
    const { t } = useT();

    return (
        <li className="flex items-center gap-3 px-4 py-3">
            {member.photo ? (
                <img
                    src={member.photo}
                    alt=""
                    className="h-12 w-10 shrink-0 rounded-md object-cover"
                />
            ) : (
                <div className="flex h-12 w-10 shrink-0 items-center justify-center rounded-md bg-neutral-100 text-neutral-400">
                    <UserRound className="h-5 w-5" />
                </div>
            )}
            <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-neutral-900">
                    {member.role === 'player' && member.jersey_number && (
                        <span className="mr-2 font-mono text-neutral-500">
                            #{member.jersey_number}
                        </span>
                    )}
                    {member.name}
                </p>
                <p className="truncate text-xs text-neutral-500">
                    {t(playerRoleLabel(member.role))}
                    {member.position ? ` · ${member.position}` : ''}
                    {member.phone_number ? ` · ${member.phone_number}` : ''}
                    {Object.values(member.extra ?? {})
                        .filter(Boolean)
                        .map((v) => ` · ${v}`)
                        .join('')}
                </p>
            </div>
            <div className="flex shrink-0 items-center gap-1">
                <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                    <a
                        href={`/players/${member.id}/id-card`}
                        target="_blank"
                        rel="noreferrer"
                        aria-label={t(':name’s ID card', { name: member.name })}
                    >
                        <IdCard className="h-4 w-4" />
                    </a>
                </Button>
                {editable && (
                    <>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={onEdit}
                            aria-label={t('Edit :name', { name: member.name })}
                        >
                            <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive"
                            onClick={onRemove}
                            aria-label={t('Remove :name', {
                                name: member.name,
                            })}
                        >
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    </>
                )}
            </div>
        </li>
    );
}

export default function TeamRoster({
    registration,
    event,
    registrationCategory,
    team,
    members,
    memberFields,
    limits,
    lock,
}: Props) {
    useForceLightMode();

    const { t, tc } = useT();
    const { flash } = usePage<{
        flash: { toast: { title: string; description?: string } | null };
    }>().props;

    useEffect(() => {
        if (flash?.toast) {
            toast(flash.toast.title, { description: flash.toast.description });
        }
    }, [flash]);

    const [dialogOpen, setDialogOpen] = useState(false);
    // Tracked by id so a member edited and saved is re-read from the fresh
    // props rather than the object captured when the dialog was opened.
    const [editingId, setEditingId] = useState<number | null>(null);
    const editing = members.find((m) => m.id === editingId) ?? null;
    const removeForm = useForm({});

    const editable = lock === null;
    const { accent, accentDark } = accentColors(event.accent_color);
    const accentStyle = {
        '--accent': accent,
        '--accent-dark': accentDark,
    } as CSSProperties;

    const players = members.filter((m) => m.role === 'player');
    const staff = members.filter((m) => m.role !== 'player');
    const atCap =
        limits.max_players !== null && limits.players >= limits.max_players;

    function openAdd() {
        setEditingId(null);
        setDialogOpen(true);
    }

    function openEdit(member: Player) {
        setEditingId(member.id);
        setDialogOpen(true);
    }

    function remove(member: Player) {
        if (
            !window.confirm(
                t('Remove :name from the roster?', { name: member.name }),
            )
        ) {
            return;
        }

        removeForm.delete(
            `/registrations/${registration.qr_token}/roster/players/${member.id}`,
            { preserveScroll: true },
        );
    }

    return (
        <>
            <Head
                title={t('Roster — :team · :event', {
                    team: team.name,
                    event: event.name,
                })}
            />

            <div
                className="relative flex min-h-screen items-start justify-center bg-neutral-950 px-4 py-10"
                style={accentStyle}
            >
                <div className="relative z-10 w-full max-w-2xl overflow-hidden rounded-3xl border-2 border-black bg-white shadow-2xl">
                    <PublicPageHeader
                        eyebrow={t('Team Roster')}
                        title={team.name}
                        subtitle={`${event.name} · ${registrationCategory.name}`}
                        logoUrl={team.logo ?? event.logo}
                        accentColor={event.accent_color}
                    />

                    <div className="flex flex-col gap-5 px-4 py-6 sm:px-6">
                        {lock !== null && (
                            <div className="flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-900">
                                <Lock className="mt-0.5 h-5 w-5 shrink-0" />
                                <div>
                                    <p className="font-semibold">
                                        {t(LOCK_COPY[lock].title)}
                                    </p>
                                    <p className="text-sm">
                                        {t(LOCK_COPY[lock].description)}
                                    </p>
                                </div>
                            </div>
                        )}

                        <div className="flex flex-col gap-2 rounded-xl border p-4 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                                <p className="text-sm font-semibold text-neutral-900">
                                    {tc(
                                        ':count player|:count players',
                                        limits.players,
                                        {
                                            count:
                                                limits.max_players !== null
                                                    ? `${limits.players} / ${limits.max_players}`
                                                    : limits.players,
                                        },
                                    )}
                                    {limits.staff > 0 && (
                                        <span className="font-normal text-neutral-500">
                                            {' '}
                                            ·{' '}
                                            {t(':count staff', {
                                                count: limits.staff,
                                            })}
                                        </span>
                                    )}
                                </p>
                                <p className="text-xs text-neutral-500">
                                    {limits.complete ? (
                                        <Badge
                                            variant="secondary"
                                            className="bg-emerald-100 text-emerald-800"
                                        >
                                            {t('Minimum reached')}
                                        </Badge>
                                    ) : limits.min_players !== null ? (
                                        t(
                                            'At least :min players needed to play',
                                            {
                                                min: limits.min_players,
                                            },
                                        )
                                    ) : null}
                                </p>
                            </div>
                            {editable && limits.closes_at && (
                                <p className="flex items-center gap-1.5 text-xs text-neutral-500">
                                    <Clock className="h-3.5 w-3.5" />
                                    {t('Editable until :date', {
                                        date: formatDateTime(limits.closes_at),
                                    })}
                                </p>
                            )}
                        </div>

                        <section className="flex flex-col gap-2">
                            <div className="flex items-center justify-between">
                                <h2 className="text-sm font-bold tracking-wide text-neutral-900 uppercase">
                                    {t('Players')}
                                </h2>
                                {editable && (
                                    <Button
                                        size="sm"
                                        onClick={openAdd}
                                        className="bg-[var(--accent)] text-white hover:bg-[var(--accent-dark)]"
                                    >
                                        <Plus className="mr-1.5 h-4 w-4" />
                                        {t('Add member')}
                                    </Button>
                                )}
                            </div>
                            {players.length === 0 ? (
                                <p className="rounded-xl border border-dashed px-4 py-8 text-center text-sm text-neutral-500">
                                    {t('No players yet.')}
                                    {editable
                                        ? ` ${t('Add your first player to get started.')}`
                                        : ''}
                                </p>
                            ) : (
                                <ul className="divide-y rounded-xl border">
                                    {players.map((member) => (
                                        <MemberRow
                                            key={member.id}
                                            member={member}
                                            editable={editable}
                                            onEdit={() => openEdit(member)}
                                            onRemove={() => remove(member)}
                                        />
                                    ))}
                                </ul>
                            )}
                            {editable && atCap && (
                                <p className="text-xs text-neutral-500">
                                    {t(
                                        'Player limit reached — staff can still be added.',
                                    )}
                                </p>
                            )}
                        </section>

                        {staff.length > 0 && (
                            <section className="flex flex-col gap-2">
                                <h2 className="text-sm font-bold tracking-wide text-neutral-900 uppercase">
                                    {t('Coaches & staff')}
                                </h2>
                                <ul className="divide-y rounded-xl border">
                                    {staff.map((member) => (
                                        <MemberRow
                                            key={member.id}
                                            member={member}
                                            editable={editable}
                                            onEdit={() => openEdit(member)}
                                            onRemove={() => remove(member)}
                                        />
                                    ))}
                                </ul>
                            </section>
                        )}

                        <p className="text-center text-xs text-neutral-500">
                            {t(
                                'Keep this link private — anyone with it can edit the roster.',
                            )}{' '}
                            <a
                                href={`/registrations/${registration.qr_token}/status`}
                                className="underline underline-offset-2"
                            >
                                {t('Registration status')}
                            </a>
                            {' · '}
                            <a
                                href={`/teams/${team.id}/id-card`}
                                className="underline underline-offset-2"
                            >
                                {t('Team ID card')}
                            </a>
                        </p>
                    </div>
                </div>
            </div>

            {editable && (
                <MemberDialog
                    key={
                        editing ? `${editing.id}:${editing.updated_at}` : 'new'
                    }
                    token={registration.qr_token}
                    member={editing}
                    memberFields={memberFields}
                    open={dialogOpen}
                    onOpenChange={setDialogOpen}
                />
            )}
        </>
    );
}
