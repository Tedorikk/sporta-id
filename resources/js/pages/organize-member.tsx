import { Head, useForm, usePage } from '@inertiajs/react';
import { Clock, Loader2, Lock, Pencil, Plus, Trash2, UserRound } from 'lucide-react';
import type { CSSProperties } from 'react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { PublicPageHeader } from '@/components/public/public-page-header';
import { RequiredMark } from '@/components/public/required-mark';
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
import { UploadImage } from '@/components/upload-image';
import { useForceLightMode } from '@/hooks/use-force-light-mode';
import { useT } from '@/hooks/use-t';
import { accentColors } from '@/lib/color';
import { formatDateTime } from '@/lib/format-date';
import type { Event } from '@/types/event';
import type { Player } from '@/types/player';
import type {
    TeamMemberField,
    TeamMemberSlot,
} from '@/types/registration-category';
import { teamMemberFieldAppliesTo } from '@/types/registration-category';

interface Limits {
    members: number;
    incomplete: number;
    complete: boolean;
    slots: (TeamMemberSlot & { count: number })[];
    full: boolean;
    closes_at: string | null;
}

/** Mirrors TeamMembersController's lock reasons (same set as the roster portal). */
type LockReason = 'payment_pending' | 'withdrawn' | 'verified' | 'closed';

interface Props {
    registration: { qr_token: string; status: string; name: string };
    event: Event;
    registrationCategory: { id: number; name: string };
    team: { id: number; name: string; logo: string | null; status: string };
    members: (Player & { is_complete: boolean })[];
    memberFields: TeamMemberField[];
    limits: Limits;
    lock: LockReason | null;
}

const LOCK_COPY: Record<LockReason, { title: string; description: string }> = {
    payment_pending: {
        title: 'Complete payment first',
        description:
            'The member list opens once the registration fee is settled. Use the link in your confirmation to pay.',
    },
    withdrawn: {
        title: 'Registration withdrawn',
        description:
            'This registration is no longer active, so the member list can’t be changed. Contact the organiser if this is unexpected.',
    },
    verified: {
        title: 'List verified',
        description:
            'The organiser has reviewed and approved this list. Contact them for any further changes.',
    },
    closed: {
        title: 'Deadline passed',
        description:
            'Changes are closed. Contact the organiser if something still needs fixing.',
    },
};

type MemberForm = {
    role: string;
    name: string;
    photo: string;
    phone_number: string;
    email: string;
    extra: Record<string, string>;
};

function toMemberForm(
    member: Player | undefined,
    memberFields: TeamMemberField[],
    defaultRole: string,
): MemberForm {
    return {
        role: member?.role ?? defaultRole,
        name: member?.name ?? '',
        photo: member?.photo ?? '',
        phone_number: member?.phone_number ?? '',
        email: member?.email ?? '',
        extra: Object.fromEntries(
            memberFields.map((f) => [f.key, member?.extra?.[f.key] ?? '']),
        ),
    };
}

function MemberDialog({
    token,
    member,
    memberFields,
    slots,
    open,
    onOpenChange,
    onSaving,
    onSaved,
}: {
    token: string;
    member: Player | null;
    memberFields: TeamMemberField[];
    slots: Limits['slots'];
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSaving: (saving: boolean) => void;
    onSaved: (name: string, wasEditing: boolean) => void;
}) {
    const { t } = useT();
    const isEditing = member !== null;
    const roleOptions = slots.map((slot) => ({
        value: slot.role,
        label: slot.label,
        full:
            slot.max !== null && slot.count >= slot.max && member?.role !== slot.role,
    }));
    const defaultRole =
        member?.role ??
        roleOptions.find((role) => !role.full)?.value ??
        roleOptions[0]?.value ??
        '';
    const form = useForm<MemberForm>(
        toMemberForm(member ?? undefined, memberFields, defaultRole),
    );
    const { data, setData, errors, processing, reset, clearErrors, isDirty } = form;
    const askedFields = memberFields.filter((mf) =>
        teamMemberFieldAppliesTo(mf, data.role),
    );

    function handleOpenChange(next: boolean) {
        if (!next) {
            reset();
            clearErrors();
        }

        onOpenChange(next);
    }

    function submit(e: React.FormEvent) {
        e.preventDefault();

        const payload = { ...data, email: data.email || null };
        onSaving(true);
        const options = {
            preserveScroll: true,
            onSuccess: () => {
                handleOpenChange(false);
                onSaved(data.name, isEditing);
            },
            onError: () => onSaving(false),
        };

        form.transform(() => payload);

        if (isEditing) {
            form.put(
                `/registrations/${token}/organize-member/players/${member.id}`,
                options,
            );
        } else {
            form.post(`/registrations/${token}/organize-member/players`, options);
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
                            {t('Every member needs a photo for their ID card.')}
                        </DialogDescription>
                    </DialogHeader>

                    <FieldGroup className="py-4">
                        <Field data-invalid={Boolean(errors.role)}>
                            <FieldLabel htmlFor="member_role">
                                {t('Role')}
                                <RequiredMark />
                            </FieldLabel>
                            <Select
                                value={data.role}
                                onValueChange={(value) => setData('role', value)}
                                disabled={processing}
                            >
                                <SelectTrigger id="member_role" className="w-full">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {roleOptions.map((role) => (
                                        <SelectItem
                                            key={role.value}
                                            value={role.value}
                                            disabled={role.full}
                                        >
                                            {t(role.label)}
                                            {role.full ? ` — ${t('full')}` : ''}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {errors.role && <FieldError>{errors.role}</FieldError>}
                        </Field>

                        <Field data-invalid={Boolean(errors.name)}>
                            <FieldLabel htmlFor="member_name">
                                {t('Full name')}
                                <RequiredMark />
                            </FieldLabel>
                            <Input
                                id="member_name"
                                value={data.name}
                                onChange={(e) => setData('name', e.target.value)}
                                autoComplete="name"
                                disabled={processing}
                            />
                            {errors.name && <FieldError>{errors.name}</FieldError>}
                        </Field>

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
                        <Button
                            type="submit"
                            disabled={processing || (isEditing && !isDirty)}
                        >
                            {processing && (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            )}
                            {isEditing
                                ? isDirty
                                    ? t('Save changes')
                                    : t('No changes')
                                : t('Add to list')}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

function MemberRow({
    member,
    label,
    editable,
    onEdit,
    onRemove,
}: {
    member: Player & { is_complete: boolean };
    label: string;
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
                    {member.name}
                </p>
                <p className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs text-neutral-500">
                    {!member.is_complete && (
                        <Badge
                            variant="secondary"
                            className="shrink-0 bg-amber-100 px-1.5 py-0 text-[10px] text-amber-800"
                        >
                            {t('Needs details')}
                        </Badge>
                    )}
                    <span className="truncate">
                        {label}
                        {member.phone_number ? ` · ${member.phone_number}` : ''}
                        {Object.values(member.extra ?? {})
                            .filter(Boolean)
                            .map((v) => ` · ${v}`)
                            .join('')}
                    </span>
                </p>
            </div>
            {editable && (
                <div className="flex shrink-0 items-center gap-1">
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
                        aria-label={t('Remove :name', { name: member.name })}
                    >
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </div>
            )}
        </li>
    );
}

export default function OrganizeMember({
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

    const { t } = useT();
    const { flash } = usePage<{
        flash: { toast: { title: string; description?: string } | null };
    }>().props;

    useEffect(() => {
        if (flash?.toast) {
            toast(flash.toast.title, { description: flash.toast.description });
        }
    }, [flash]);

    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const editing = members.find((m) => m.id === editingId) ?? null;
    const removeForm = useForm({});
    const editable = lock === null;
    const { accent, accentDark } = accentColors(event.accent_color);
    const accentStyle = {
        '--accent': accent,
        '--accent-dark': accentDark,
    } as CSSProperties;

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
            !window.confirm(t('Remove :name from the list?', { name: member.name }))
        ) {
            return;
        }

        removeForm.delete(
            `/registrations/${registration.qr_token}/organize-member/players/${member.id}`,
            { preserveScroll: true },
        );
    }

    const labelFor = (role: string) =>
        limits.slots.find((s) => s.role === role)?.label ?? role;

    return (
        <>
            <Head
                title={t('Members — :team · :event', {
                    team: team.name,
                    event: event.name,
                })}
            />

            <div
                className="relative flex min-h-screen items-start justify-center bg-paper px-4 py-10"
                style={accentStyle}
            >
                <div className="relative z-10 w-full max-w-2xl overflow-hidden rounded-2xl border border-ink/10 bg-paper">
                    <PublicPageHeader
                        eyebrow={t('Organize Members')}
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
                                    {t(':count member|:count members', {
                                        count: limits.members,
                                    })}
                                </p>
                                {limits.complete ? (
                                    <Badge
                                        variant="secondary"
                                        className="mt-1 bg-emerald-100 text-emerald-800"
                                    >
                                        {t('Complete')}
                                    </Badge>
                                ) : limits.incomplete > 0 ? (
                                    <p className="text-xs text-neutral-500">
                                        {t(':count still need details', {
                                            count: limits.incomplete,
                                        })}
                                    </p>
                                ) : null}
                            </div>
                            {editable && limits.closes_at && (
                                <p className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs text-neutral-500">
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
                                    {t('Members')}
                                </h2>
                                {editable && (
                                    <Button
                                        size="sm"
                                        onClick={openAdd}
                                        disabled={limits.full}
                                        title={
                                            limits.full
                                                ? t('Every role is filled')
                                                : undefined
                                        }
                                        className="bg-[var(--accent)] text-ink hover:bg-[var(--accent-dark)]"
                                    >
                                        <Plus className="mr-1.5 h-4 w-4" />
                                        {t('Add member')}
                                    </Button>
                                )}
                            </div>
                            {members.length === 0 ? (
                                <p className="rounded-xl border border-dashed px-4 py-8 text-center text-sm text-neutral-500">
                                    {t('No members yet.')}
                                    {editable
                                        ? ` ${t('Add your first member to get started.')}`
                                        : ''}
                                </p>
                            ) : (
                                <ul className="divide-y rounded-xl border">
                                    {members.map((member) => (
                                        <MemberRow
                                            key={member.id}
                                            member={member}
                                            label={labelFor(member.role)}
                                            editable={editable}
                                            onEdit={() => openEdit(member)}
                                            onRemove={() => remove(member)}
                                        />
                                    ))}
                                </ul>
                            )}
                            {editable && limits.slots.length > 0 && (
                                <p className="text-xs text-neutral-500">
                                    {limits.full
                                        ? `${t('Every role is filled')} · `
                                        : ''}
                                    {limits.slots
                                        .map(
                                            (slot) =>
                                                `${t(slot.label)} ${slot.count}/${slot.max ?? '∞'}`,
                                        )
                                        .join(' · ')}
                                </p>
                            )}
                        </section>

                        <p className="text-center text-xs text-neutral-500">
                            <a
                                href={`/registrations/${registration.qr_token}/status`}
                                className="underline underline-offset-2"
                            >
                                {t('Registration status')}
                            </a>
                        </p>
                    </div>
                </div>
            </div>

            {editable && (
                <MemberDialog
                    key={editing ? `${editing.id}:${editing.updated_at}` : 'new'}
                    token={registration.qr_token}
                    member={editing}
                    memberFields={memberFields}
                    slots={limits.slots}
                    open={dialogOpen}
                    onOpenChange={setDialogOpen}
                    onSaving={() => {}}
                    onSaved={() => {}}
                />
            )}
        </>
    );
}
