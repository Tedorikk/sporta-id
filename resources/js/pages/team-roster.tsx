import { Head, useForm, usePage } from '@inertiajs/react';
import {
    CheckCircle2,
    Clock,
    Copy,
    IdCard,
    Link2,
    Loader2,
    Lock,
    MessageCircle,
    Pencil,
    Plus,
    RefreshCw,
    Trash2,
    UserRound,
} from 'lucide-react';
import type { CSSProperties } from 'react';
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { toast } from 'sonner';
import {
    MemberDetailsFields,
    toMemberForm,
} from '@/components/public/member-details-fields';
import type { MemberForm } from '@/components/public/member-details-fields';
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
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    Field,
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
import { useClipboard } from '@/hooks/use-clipboard';
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
    /** Members still missing a photo, document or birth detail. */
    incomplete: number;
    min_players: number | null;
    max_players: number | null;
    complete: boolean;
    /** Every role the team may enter, with how many it has and may have. */
    slots: RosterSlotStatus[];
    /** Every slot has a ceiling and has reached it — nobody else can be added. */
    full: boolean;
    closes_at: string | null;
}

interface RosterSlotStatus {
    role: PlayerRole;
    label: string;
    min: number;
    max: number | null;
    count: number;
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
    /** Whether this team feeds a bracket — hides jersey/identity fields that only apply there. */
    isTournament: boolean;
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

/**
 * Add/edit form for one roster member. Validation lives on the server
 * (RosterService) so the same rules gate the organiser's form; this only
 * shows what comes back.
 */
function MemberDialog({
    token,
    member,
    memberFields,
    isTournament,
    slots,
    open,
    onOpenChange,
    onSaving,
    onSaved,
}: {
    token: string;
    member: Player | null;
    memberFields: RosterMemberField[];
    isTournament: boolean;
    slots: RosterSlotStatus[];
    open: boolean;
    onOpenChange: (open: boolean) => void;
    /** The save is being sent — the page mutes the server's toast for it. */
    onSaving: (saving: boolean) => void;
    /** After a successful save — the page shows its own confirmation. */
    onSaved: (name: string, wasEditing: boolean) => void;
}) {
    const { t } = useT();
    const isEditing = member !== null;
    // The roles on offer: the block's slots when the form has one, else every
    // role. A full slot is listed but can't be picked — unless it is the role
    // this member already holds.
    const roleOptions =
        slots.length > 0
            ? slots.map((slot) => ({
                  value: slot.role,
                  label: slot.label,
                  full:
                      slot.max !== null &&
                      slot.count >= slot.max &&
                      member?.role !== slot.role,
              }))
            : PLAYER_ROLES.map((role) => ({ ...role, full: false }));
    const defaultRole =
        member?.role ??
        roleOptions.find((role) => !role.full)?.value ??
        roleOptions[0]?.value ??
        'player';
    // Mounted with a `key` per member (see TeamRoster), so the initial values
    // here are always the right member's; closing just rolls back to them.
    const form = useForm<MemberForm>({
        ...toMemberForm(member ?? undefined, memberFields),
        role: defaultRole,
    });
    const { data, setData, errors, processing, reset, clearErrors, isDirty } =
        form;

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
        onSaving(true);
        const options = {
            preserveScroll: true,
            onSuccess: () => {
                handleOpenChange(false);
                onSaved(data.name, isEditing);
            },
            // A validation error brings no flash, so un-mute for the next one.
            onError: () => onSaving(false),
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
                            {isTournament
                                ? t(
                                      'Every member needs an identity document and a photo for their ID card.',
                                  )
                                : t('Every member needs a photo for their ID card.')}
                        </DialogDescription>
                    </DialogHeader>

                    <FieldGroup className="py-4">
                        <FieldGroup>
                            <Field data-invalid={Boolean(errors.role)}>
                                <FieldLabel htmlFor="member_role">
                                    {t('Role')}
                                    <RequiredMark />
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
                                        {roleOptions.map((role) => (
                                            <SelectItem
                                                key={role.value}
                                                value={role.value}
                                                disabled={role.full}
                                            >
                                                {t(role.label)}
                                                {role.full
                                                    ? ` — ${t('full')}`
                                                    : ''}
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
                                    <RequiredMark />
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

                        {isPlayer && isTournament && (
                            <div className="grid grid-cols-2 gap-3">
                                <Field
                                    data-invalid={Boolean(errors.jersey_number)}
                                >
                                    <FieldLabel htmlFor="member_jersey">
                                        {t('Jersey number')}
                                        <RequiredMark />
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

                        <MemberDetailsFields
                            data={data}
                            setData={setData}
                            errors={errors}
                            processing={processing}
                            memberFields={memberFields}
                            isTournament={isTournament}
                        />
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
                            // Nothing changed → nothing to save; the button
                            // says so instead of pretending.
                            disabled={processing || (isEditing && !isDirty)}
                        >
                            {processing && (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            )}
                            {isEditing
                                ? isDirty
                                    ? t('Save changes')
                                    : t('No changes')
                                : t('Add to roster')}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

/** The WhatsApp text a manager sends one member; the link goes on its own line. */
function inviteMessage(
    t: ReturnType<typeof useT>['t'],
    member: Player,
    team: string,
    event: string,
    closesAt: string | null,
): string {
    const ask = t(
        'Hi :name, please complete your own details (photo, identity document, birth details) for :team at :event using this link',
        { name: member.name, team, event },
    );
    const by = closesAt
        ? t('before :deadline', { deadline: formatDateTime(closesAt) })
        : '';

    return `${ask}${by ? ` ${by}` : ''}:\n${member.invite_url ?? ''}`;
}

function whatsappHref(text: string): string {
    return `https://wa.me/?text=${encodeURIComponent(text)}`;
}

function MemberRow({
    member,
    editable,
    teamName,
    eventName,
    closesAt,
    onEdit,
    onRemove,
    onNewLink,
}: {
    member: Player;
    editable: boolean;
    teamName: string;
    eventName: string;
    closesAt: string | null;
    onEdit: () => void;
    onRemove: () => void;
    onNewLink: () => void;
}) {
    const { t } = useT();
    const [, copy] = useClipboard();
    const canInvite =
        editable && member.is_complete === false && Boolean(member.invite_url);

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
                <p className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs text-neutral-500">
                    {member.is_complete === false && (
                        <Badge
                            variant="secondary"
                            className="shrink-0 bg-amber-100 px-1.5 py-0 text-[10px] text-amber-800"
                        >
                            {t('Needs details')}
                        </Badge>
                    )}
                    <span className="truncate">
                        {t(playerRoleLabel(member.role))}
                        {member.position ? ` · ${member.position}` : ''}
                        {member.phone_number ? ` · ${member.phone_number}` : ''}
                        {Object.values(member.extra ?? {})
                            .filter(Boolean)
                            .map((v) => ` · ${v}`)
                            .join('')}
                    </span>
                </p>
            </div>
            <div className="flex shrink-0 items-center gap-1">
                {/* No card to show until the photo and details are in. */}
                {member.is_complete !== false && (
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        asChild
                    >
                        <a
                            href={`/players/${member.id}/id-card`}
                            target="_blank"
                            rel="noreferrer"
                            aria-label={t(':name’s ID card', {
                                name: member.name,
                            })}
                        >
                            <IdCard className="h-4 w-4" />
                        </a>
                    </Button>
                )}
                {canInvite && (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-[var(--accent)]"
                                aria-label={t('Send :name their link', {
                                    name: member.name,
                                })}
                            >
                                <Link2 className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem
                                onSelect={() => {
                                    void copy(member.invite_url ?? '').then(
                                        (ok) =>
                                            ok &&
                                            toast(t('Link copied'), {
                                                description: t(
                                                    'Send it to :name — the link opens only their own entry.',
                                                    { name: member.name },
                                                ),
                                            }),
                                    );
                                }}
                            >
                                <Copy className="mr-2 h-4 w-4" />
                                {t('Copy their link')}
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                                <a
                                    href={whatsappHref(
                                        inviteMessage(
                                            t,
                                            member,
                                            teamName,
                                            eventName,
                                            closesAt,
                                        ),
                                    )}
                                    target="_blank"
                                    rel="noreferrer"
                                >
                                    <MessageCircle className="mr-2 h-4 w-4" />
                                    {t('Send via WhatsApp')}
                                </a>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onSelect={onNewLink}>
                                <RefreshCw className="mr-2 h-4 w-4" />
                                {t('New link (old one stops working)')}
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                )}
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
    isTournament,
    limits,
    lock,
}: Props) {
    useForceLightMode();

    const { t, tc } = useT();
    const { flash } = usePage<{
        flash: { toast: { title: string; description?: string } | null };
    }>().props;

    // A member just saved gets a proper confirmation dialog rather than a
    // toast in the corner — the server's flash toast is skipped for that one.
    const [saved, setSaved] = useState<{
        name: string;
        wasEditing: boolean;
    } | null>(null);
    const suppressToast = useRef(false);

    useEffect(() => {
        if (flash?.toast && !suppressToast.current) {
            toast(flash.toast.title, { description: flash.toast.description });
        }

        suppressToast.current = false;
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
    const [, copyRosterLink] = useClipboard();
    const rosterUrl = useSyncExternalStore(
        () => () => {},
        () => window.location.href.split('?')[0],
        () => '',
    );

    function openAdd() {
        setEditingId(null);
        setDialogOpen(true);
    }

    function openEdit(member: Player) {
        setEditingId(member.id);
        setDialogOpen(true);
    }

    function newLink(member: Player) {
        if (
            !window.confirm(
                t(
                    'Issue :name a new link? The one you already sent will stop working.',
                    { name: member.name },
                ),
            )
        ) {
            return;
        }

        removeForm.post(
            `/registrations/${registration.qr_token}/roster/players/${member.id}/invite`,
            { preserveScroll: true },
        );
    }

    // One message for the team's WhatsApp group: every member still owing
    // details, each with their own link.
    const incompleteMembers = members.filter(
        (m) => m.is_complete === false && m.invite_url,
    );
    const shareAllText = [
        t(
            'Please complete your own details for :team at :event — photo, identity document and birth details — using your personal link',
            { team: team.name, event: event.name },
        ) +
            (limits.closes_at
                ? ` ${t('before :deadline', { deadline: formatDateTime(limits.closes_at) })}`
                : '') +
            ':',
        ...incompleteMembers.map((m) => `• ${m.name}: ${m.invite_url}`),
    ].join('\n');
    const [, copyAll] = useClipboard();

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
                className="relative flex min-h-screen items-start justify-center bg-paper px-4 py-10"
                style={accentStyle}
            >
                <div className="relative z-10 w-full max-w-2xl overflow-hidden rounded-2xl border border-ink/10 bg-paper">
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

                        {/* The link *is* the login. Lose it and the roster is
                            unreachable, so it gets a card of its own, not a
                            footnote. */}
                        <div className="flex flex-col gap-2 rounded-xl border-2 border-amber-300 bg-amber-50 p-4">
                            <p className="flex items-center gap-1.5 text-sm font-bold text-ink">
                                <Link2 className="h-4 w-4" />
                                {t('Your roster link')}
                            </p>
                            <p className="text-xs text-amber-900">
                                {t(
                                    'Save this link — don’t lose it. There is no login: this link is the only way back to edit this roster. Keep it private; anyone who has it can change the team sheet.',
                                )}
                            </p>
                            <p
                                className="truncate rounded-md bg-white/70 px-2 py-1 font-mono text-[11px] text-neutral-700"
                                suppressHydrationWarning
                            >
                                {rosterUrl}
                            </p>
                            <div className="flex flex-col gap-2 sm:flex-row">
                                <Button
                                    type="button"
                                    size="sm"
                                    className="flex-1 cursor-pointer bg-amber-600 text-paper hover:bg-amber-700"
                                    disabled={!rosterUrl}
                                    onClick={() =>
                                        void copyRosterLink(rosterUrl).then(
                                            (ok) =>
                                                ok &&
                                                toast(t('Roster link copied'), {
                                                    description: t(
                                                        'Paste it somewhere safe — your notes, or a message to yourself.',
                                                    ),
                                                }),
                                        )
                                    }
                                >
                                    <Copy className="mr-1.5 h-3.5 w-3.5" />
                                    {t('Copy roster link')}
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="flex-1 border-amber-300 bg-white"
                                    asChild
                                >
                                    <a
                                        href={whatsappHref(
                                            `${t('Roster link for :team (:event) — keep this message:', { team: team.name, event: event.name })}\n${rosterUrl}`,
                                        )}
                                        target="_blank"
                                        rel="noreferrer"
                                    >
                                        <MessageCircle className="mr-1.5 h-3.5 w-3.5" />
                                        {t('Send to myself on WhatsApp')}
                                    </a>
                                </Button>
                            </div>
                        </div>

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
                                            {t('Roster complete')}
                                        </Badge>
                                    ) : limits.incomplete > 0 ? (
                                        <Badge
                                            variant="secondary"
                                            className="bg-amber-100 text-amber-800"
                                        >
                                            {t(
                                                ':count of :total members still need details',
                                                {
                                                    count: limits.incomplete,
                                                    total:
                                                        limits.players +
                                                        limits.staff,
                                                },
                                            )}
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
                                <p className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs text-neutral-500">
                                    <Clock className="h-3.5 w-3.5" />
                                    {t('Editable until :date', {
                                        date: formatDateTime(limits.closes_at),
                                    })}
                                </p>
                            )}
                        </div>

                        {editable && incompleteMembers.length > 0 && (
                            <div className="flex flex-col gap-2 rounded-xl border border-dashed border-neutral-300 p-4">
                                <p className="text-sm font-semibold text-neutral-900">
                                    {t('Let members fill in their own details')}
                                </p>
                                <p className="text-xs text-neutral-500">
                                    {t(
                                        'Each member has a personal link that opens only their entry. Paste one message into the team group, or send links one by one from the list below.',
                                    )}
                                </p>
                                <div className="mt-1 flex flex-col gap-2 sm:flex-row">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        className="flex-1 cursor-pointer"
                                        onClick={() =>
                                            void copyAll(shareAllText).then(
                                                (ok) =>
                                                    ok &&
                                                    toast(t('Message copied'), {
                                                        description: t(
                                                            ':count links, one per member still missing details.',
                                                            {
                                                                count: incompleteMembers.length,
                                                            },
                                                        ),
                                                    }),
                                            )
                                        }
                                    >
                                        <Copy className="mr-1.5 h-3.5 w-3.5" />
                                        {t('Copy message for the group')}
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="flex-1"
                                        asChild
                                    >
                                        <a
                                            href={whatsappHref(shareAllText)}
                                            target="_blank"
                                            rel="noreferrer"
                                        >
                                            <MessageCircle className="mr-1.5 h-3.5 w-3.5" />
                                            WhatsApp
                                        </a>
                                    </Button>
                                </div>
                            </div>
                        )}

                        <section className="flex flex-col gap-2">
                            <div className="flex items-center justify-between">
                                <h2 className="text-sm font-bold tracking-wide text-neutral-900 uppercase">
                                    {t('Players')}
                                </h2>
                                {editable && (
                                    <Button
                                        size="sm"
                                        onClick={openAdd}
                                        disabled={limits.full}
                                        title={
                                            limits.full
                                                ? t('Every slot is filled')
                                                : undefined
                                        }
                                        className="bg-[var(--accent)] text-ink hover:bg-[var(--accent-dark)]"
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
                                            teamName={team.name}
                                            eventName={event.name}
                                            closesAt={limits.closes_at}
                                            onEdit={() => openEdit(member)}
                                            onRemove={() => remove(member)}
                                            onNewLink={() => newLink(member)}
                                        />
                                    ))}
                                </ul>
                            )}
                            {editable && limits.slots.length > 0 && (
                                <p className="text-xs text-neutral-500">
                                    {limits.full
                                        ? `${t('Every slot is filled')} · `
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
                                            teamName={team.name}
                                            eventName={event.name}
                                            closesAt={limits.closes_at}
                                            onEdit={() => openEdit(member)}
                                            onRemove={() => remove(member)}
                                            onNewLink={() => newLink(member)}
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
                    isTournament={isTournament}
                    slots={limits.slots}
                    open={dialogOpen}
                    onOpenChange={setDialogOpen}
                    onSaving={(saving) => {
                        suppressToast.current = saving;
                    }}
                    onSaved={(name, wasEditing) =>
                        setSaved({ name, wasEditing })
                    }
                />
            )}

            <Dialog
                open={saved !== null}
                onOpenChange={(open) => !open && setSaved(null)}
            >
                <DialogContent className="sm:max-w-sm">
                    <DialogHeader className="items-center text-center">
                        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100">
                            <CheckCircle2 className="h-8 w-8 text-emerald-600" />
                        </div>
                        <DialogTitle className="text-xl">
                            {t('Saved')}
                        </DialogTitle>
                        <DialogDescription>
                            {saved?.wasEditing
                                ? t(':name updated.', { name: saved.name })
                                : t(':name is on the roster.', {
                                      name: saved?.name ?? '',
                                  })}
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="sm:justify-center">
                        <Button
                            type="button"
                            onClick={() => setSaved(null)}
                            className="w-full sm:w-auto"
                        >
                            {t('OK')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
