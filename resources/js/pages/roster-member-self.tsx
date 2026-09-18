import { Head, useForm, usePage } from '@inertiajs/react';
import { CheckCircle2, Clock, IdCard, Loader2, Lock } from 'lucide-react';
import type { CSSProperties } from 'react';
import { useEffect } from 'react';
import { toast } from 'sonner';
import {
    MemberDetailsFields,
    toMemberForm,
} from '@/components/public/member-details-fields';
import type { MemberForm } from '@/components/public/member-details-fields';
import { PublicPageHeader } from '@/components/public/public-page-header';
import { Button } from '@/components/ui/button';
import { FieldGroup } from '@/components/ui/field';
import { useForceLightMode } from '@/hooks/use-force-light-mode';
import { useT } from '@/hooks/use-t';
import { accentColors } from '@/lib/color';
import { formatDateTime } from '@/lib/format-date';
import type { Event } from '@/types/event';
import type { Player } from '@/types/player';
import { playerRoleLabel } from '@/types/player';
import type { RosterMemberField } from '@/types/registration-category';

/** Mirrors RosterService::lockReason(); same copy as the manager's portal. */
type LockReason = 'payment_pending' | 'withdrawn' | 'verified' | 'closed';

const LOCK_COPY: Record<LockReason, string> = {
    payment_pending:
        'The team’s registration is still awaiting payment. Ask your manager, then try again.',
    withdrawn:
        'This team’s registration is no longer active, so nothing can be changed.',
    verified:
        'The organiser has already approved this team sheet. Ask your manager or the organiser for any change.',
    closed: 'The roster deadline has passed. Ask your manager or the organiser if something still needs fixing.',
};

interface Props {
    token: string;
    event: Event;
    team: { id: number; name: string; logo: string | null; status: string };
    member: Player;
    memberFields: RosterMemberField[];
    isTournament: boolean;
    closesAt: string | null;
    lock: LockReason | null;
}

/**
 * A roster member's own page: they fill in their photo, identity document
 * and birth details from the link their manager sent, instead of the
 * manager collecting and retyping everything. Name, role and jersey are
 * the manager's call and are shown, not edited.
 */
export default function RosterMemberSelf({
    token,
    event,
    team,
    member,
    memberFields,
    isTournament,
    closesAt,
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

    const form = useForm<MemberForm>(toMemberForm(member, memberFields));
    const { data, setData, errors, processing } = form;
    const editable = lock === null;
    const { accent, accentDark } = accentColors(event.accent_color);
    const accentStyle = {
        '--accent': accent,
        '--accent-dark': accentDark,
    } as CSSProperties;

    function submit(e: React.FormEvent) {
        e.preventDefault();

        form.transform((current) => ({
            ...current,
            position: data.role === 'player' ? data.position || null : null,
            email: data.email || null,
            certificate: data.role === 'medic' ? data.certificate : null,
        }));
        form.put(`/roster-members/${token}`, { preserveScroll: true });
    }

    return (
        <>
            <Head
                title={t('Your details — :team · :event', {
                    team: team.name,
                    event: event.name,
                })}
            />

            <div
                className="relative flex min-h-screen items-start justify-center bg-paper px-4 py-10"
                style={accentStyle}
            >
                <div className="relative z-10 w-full max-w-lg overflow-hidden rounded-2xl border border-ink/10 bg-paper">
                    <PublicPageHeader
                        eyebrow={t('Team Roster')}
                        title={member.name}
                        subtitle={`${t(playerRoleLabel(member.role))}${
                            member.role === 'player' && member.jersey_number
                                ? ` #${member.jersey_number}`
                                : ''
                        } · ${team.name} · ${event.name}`}
                        logoUrl={team.logo ?? event.logo}
                        accentColor={event.accent_color}
                    />

                    <div className="flex flex-col gap-5 px-4 py-6 sm:px-6">
                        {lock !== null ? (
                            <div className="flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-900">
                                <Lock className="mt-0.5 h-5 w-5 shrink-0" />
                                <p className="text-sm">{t(LOCK_COPY[lock])}</p>
                            </div>
                        ) : member.is_complete ? (
                            <div className="flex gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-900">
                                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
                                <div className="flex flex-col gap-2">
                                    <p className="text-sm">
                                        {t(
                                            'Your details are complete. You can still correct something below until the roster closes.',
                                        )}
                                    </p>
                                    <Button
                                        asChild
                                        variant="outline"
                                        size="sm"
                                        className="w-fit"
                                    >
                                        <a
                                            href={`/players/${member.id}/id-card`}
                                            target="_blank"
                                            rel="noreferrer"
                                        >
                                            <IdCard className="mr-1.5 h-4 w-4" />
                                            {t('Open your ID card')}
                                        </a>
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            <p className="text-sm text-neutral-600">
                                {isTournament
                                    ? t(
                                          'Your team manager asked you to complete your own details for the tournament ID card. Everything here is required.',
                                      )
                                    : t(
                                          'Your team manager asked you to complete your own details for your ID card. Everything here is required.',
                                      )}
                            </p>
                        )}

                        {editable && closesAt && (
                            <p
                                className="flex items-center gap-1.5 text-xs text-neutral-500"
                                suppressHydrationWarning
                            >
                                <Clock className="h-3.5 w-3.5" />
                                {t('Editable until :date', {
                                    date: formatDateTime(closesAt),
                                })}
                            </p>
                        )}

                        {editable && (
                            <form onSubmit={submit}>
                                <FieldGroup>
                                    <MemberDetailsFields
                                        data={data}
                                        setData={setData}
                                        errors={errors}
                                        processing={processing}
                                        memberFields={memberFields}
                                        isTournament={isTournament}
                                    />

                                    <Button
                                        type="submit"
                                        disabled={processing}
                                        className="w-full bg-[var(--accent)] font-bold tracking-wide text-ink uppercase hover:bg-[var(--accent-dark)]"
                                    >
                                        {processing && (
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        )}
                                        {t('Save my details')}
                                    </Button>
                                </FieldGroup>
                            </form>
                        )}

                        <p className="text-center text-xs text-neutral-500">
                            {t(
                                'This link is yours alone — it only opens your own entry on the team sheet.',
                            )}
                        </p>
                    </div>
                </div>
            </div>
        </>
    );
}
