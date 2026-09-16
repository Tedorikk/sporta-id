import { Head, router } from '@inertiajs/react';
import { CheckCircle2, Clock, XCircle } from 'lucide-react';
import { useState } from 'react';
import type { CSSProperties } from 'react';
import { PublicPageHeader } from '@/components/public/public-page-header';
import { Button } from '@/components/ui/button';
import { useT } from '@/hooks/use-t';
import { formatRupiah } from '@/lib/format-currency';
import { loadSnapScript } from '@/lib/midtrans';
import type { VoteReceipt } from '@/types/award';

interface Props {
    vote: VoteReceipt;
    award: {
        id: number;
        title: string;
        is_paid: boolean;
        price_per_vote: number | null;
    } | null;
    event: { id: number; name: string; accent_color: string | null } | null;
}

const STATE = {
    pending: {
        icon: Clock,
        tone: 'text-amber-500',
        heading: 'Awaiting payment',
        body: 'Your votes are reserved but will only be counted once payment completes.',
    },
    counted: {
        icon: CheckCircle2,
        tone: 'text-emerald-600',
        heading: 'Votes counted',
        body: 'Thanks for voting. Your votes are in the tally.',
    },
    void: {
        icon: XCircle,
        tone: 'text-neutral-400',
        heading: 'Not counted',
        body: 'This payment did not complete, so these votes were never counted.',
    },
} as const;

export default function VoteStatus({ vote, award, event }: Props) {
    const [isPaying, setIsPaying] = useState(false);

    const { t } = useT();
    const state = STATE[vote.status];
    const Icon = state.icon;

    const accentStyle = {
        '--accent-color': event?.accent_color ?? '#dc2626',
    } as CSSProperties;

    const payNow = () => {
        setIsPaying(true);

        // The Snap token is minted per attempt rather than stored on the page,
        // so an abandoned checkout can simply be retried from here.
        window
            .fetch(`/votes/${vote.reference}/pay`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                    'X-CSRF-TOKEN':
                        document
                            .querySelector('meta[name="csrf-token"]')
                            ?.getAttribute('content') ?? '',
                },
            })
            .then((response) => response.json())
            .then((payload) =>
                loadSnapScript(
                    payload.midtrans_client_key,
                    payload.midtrans_is_production,
                ).then(() => {
                    window.snap?.pay(payload.snap_token, {
                        onSuccess: () => router.reload(),
                        onPending: () => router.reload(),
                        onError: () => setIsPaying(false),
                        onClose: () => setIsPaying(false),
                    });
                }),
            )
            .catch(() => setIsPaying(false));
    };

    return (
        <>
            <Head
                title={`${t(state.heading)} — ${award?.title ?? t('Vote')}`}
            />

            <div
                className="flex min-h-screen flex-col items-center justify-center bg-neutral-950 px-4 py-10"
                style={accentStyle}
            >
                <div className="w-full max-w-sm overflow-hidden rounded-3xl border-2 border-black bg-white shadow-2xl">
                    <PublicPageHeader
                        eyebrow={t('Vote')}
                        title={award?.title ?? t('Your vote')}
                        subtitle={event?.name}
                        accentColor={event?.accent_color}
                    />

                    <div className="flex flex-col items-center gap-4 px-6 py-8 text-center">
                        <Icon className={`h-10 w-10 ${state.tone}`} />

                        <div>
                            <p className="text-lg font-bold text-neutral-900">
                                {t(state.heading)}
                            </p>
                            <p className="mt-1 text-sm text-neutral-600">
                                {t(state.body)}
                            </p>
                        </div>

                        <dl className="w-full space-y-1 rounded-lg bg-neutral-50 px-4 py-3 text-left text-sm">
                            <div className="flex justify-between">
                                <dt className="text-neutral-500">{t('For')}</dt>
                                <dd className="font-medium text-neutral-900">
                                    {vote.nominee_name}
                                </dd>
                            </div>
                            <div className="flex justify-between">
                                <dt className="text-neutral-500">
                                    {t('Votes')}
                                </dt>
                                <dd className="font-medium text-neutral-900 tabular-nums">
                                    {vote.quantity}
                                </dd>
                            </div>
                            {vote.amount !== null && (
                                <div className="flex justify-between">
                                    <dt className="text-neutral-500">
                                        {t('Total')}
                                    </dt>
                                    <dd className="font-medium text-neutral-900">
                                        {formatRupiah(vote.amount)}
                                    </dd>
                                </div>
                            )}
                        </dl>

                        {vote.status === 'pending' && (
                            <Button
                                type="button"
                                onClick={payNow}
                                disabled={isPaying}
                                className="w-full"
                            >
                                {isPaying
                                    ? t('Opening payment…')
                                    : t('Pay Now')}
                            </Button>
                        )}

                        {event && award && (
                            <button
                                type="button"
                                onClick={() =>
                                    router.visit(
                                        `/events/${event.id}/awards/${award.id}/vote`,
                                    )
                                }
                                className="text-xs font-medium text-neutral-500 underline"
                            >
                                {t('Back to the ballot')}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}
