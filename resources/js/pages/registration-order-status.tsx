import { Head } from '@inertiajs/react';
import axios from 'axios';
import { toast } from 'sonner';
import { CheckCircle2, Clock, Loader2, Ticket, XCircle } from 'lucide-react';
import { useState } from 'react';
import { pay } from '@/actions/App/Http/Controllers/GroupRegistrationController';
import { PayLinkShare } from '@/components/public/pay-link-share';
import { PublicPageHeader } from '@/components/public/public-page-header';
import { Button } from '@/components/ui/button';
import { useForceLightMode } from '@/hooks/use-force-light-mode';
import { useT } from '@/hooks/use-t';
import { formatRupiah } from '@/lib/format-currency';
import { loadSnapScript } from '@/lib/midtrans';
import type { RegistrationOrder } from '@/types/registration-order';

interface Props {
    order: RegistrationOrder;
}

const STATUS_COPY: Record<string, { label: string; description: string }> = {
    pending_payment: {
        label: 'Payment Pending',
        description:
            'Complete your payment to confirm every participant below.',
    },
    confirmed: {
        label: 'Confirmed',
        description:
            'This order is confirmed — every participant below is registered.',
    },
    rejected: {
        label: 'Rejected',
        description: 'This order was rejected by the organizer.',
    },
    cancelled: {
        label: 'Cancelled',
        description: 'This order was cancelled.',
    },
    expired: {
        label: 'Expired',
        description: 'This order expired before payment was completed.',
    },
};

interface PayResponse {
    provider: 'midtrans' | 'xendit';
    checkoutUrl: string | null;
    snapToken: string | null;
    midtransClientKey: string | null;
    midtransIsProduction: boolean;
}

export default function RegistrationOrderStatus({ order }: Props) {
    useForceLightMode();

    const { t } = useT();
    const [isPaying, setIsPaying] = useState(false);

    const copy = STATUS_COPY[order.status] ?? STATUS_COPY.confirmed;
    const statusLabel = t(copy.label);
    const participants = order.registrations ?? [];
    const total = participants.reduce(
        (sum, r) => sum + Number(r.registration_category?.price ?? 0),
        0,
    );

    const Icon =
        order.status === 'confirmed'
            ? CheckCircle2
            : order.status === 'pending_payment'
              ? Clock
              : XCircle;
    const iconColor =
        order.status === 'confirmed'
            ? 'text-green-600 bg-green-100'
            : order.status === 'pending_payment'
              ? 'text-amber-600 bg-amber-100'
              : 'text-red-600 bg-red-100';

    const payNow = () => {
        setIsPaying(true);

        axios
            .post<PayResponse>(pay.url(order))
            .then(({ data }) => {
                if (data.provider === 'xendit' && data.checkoutUrl) {
                    window.location.assign(data.checkoutUrl);

                    return null;
                }

                if (!data.snapToken || !data.midtransClientKey) {
                    throw new Error('Payment checkout is unavailable.');
                }

                return loadSnapScript(
                    data.midtransClientKey,
                    data.midtransIsProduction,
                ).then(() => data);
            })
            .then((data) => {
                if (!data?.snapToken) {
                    return;
                }

                window.snap?.pay(data.snapToken, {
                    onSuccess: () => window.location.reload(),
                    onPending: () => window.location.reload(),
                    onError: () => setIsPaying(false),
                    onClose: () => setIsPaying(false),
                });
            })
            .catch((error) => { setIsPaying(false); toast.error(error.message || "Payment checkout is unavailable at this time."); });
    };

    return (
        <>
            <Head
                title={t('Order :status — :event', {
                    status: statusLabel,
                    event: order.event?.name ?? '',
                })}
            />

            <div className="relative flex min-h-screen items-center justify-center bg-paper px-4 py-10">
                <div className="relative z-10 w-full max-w-md overflow-hidden rounded-2xl border border-ink/10 bg-paper">
                    <PublicPageHeader
                        eyebrow={t('Group Registration')}
                        title={order.event?.name ?? ''}
                        subtitle={t(':count participant(s)', {
                            count: participants.length,
                        })}
                        logoUrl={order.event?.logo}
                        accentColor={order.event?.accent_color}
                    />

                    <div className="flex flex-col items-center gap-4 px-6 py-10 text-center">
                        <div
                            className={`flex h-16 w-16 items-center justify-center rounded-full ${iconColor}`}
                        >
                            <Icon className="h-8 w-8" />
                        </div>
                        <h2 className="text-xl font-bold">{statusLabel}</h2>
                        <p className="text-neutral-600">
                            {t(copy.description)}
                        </p>

                        {order.status === 'pending_payment' && (
                            <>
                                <p className="text-2xl font-bold text-neutral-900">
                                    {formatRupiah(total)}
                                </p>
                                <Button
                                    type="button"
                                    onClick={payNow}
                                    disabled={isPaying}
                                    className="w-full font-bold tracking-wide uppercase"
                                >
                                    {isPaying ? (
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    ) : null}
                                    {isPaying
                                        ? t('Opening payment…')
                                        : t('Pay Now')}
                                </Button>
                                <PayLinkShare
                                    qrToken={order.qr_token}
                                    expiresAt={order.expires_at}
                                    message={t(
                                        'Please pay the registration fee of :price for :count participant(s) (:event) here:',
                                        {
                                            price: formatRupiah(total),
                                            count: participants.length,
                                            event: order.event?.name ?? '',
                                        },
                                    )}
                                    basePath="registration-orders"
                                />
                            </>
                        )}
                    </div>

                    <div className="flex flex-col gap-2 border-t border-neutral-200 px-6 py-5">
                        <p className="text-xs font-semibold tracking-wide text-neutral-500 uppercase">
                            {t('Participants')}
                        </p>
                        {participants.map((registration) => (
                            <a
                                key={registration.id}
                                href={`/registrations/${registration.qr_token}/status`}
                                className="flex items-center justify-between gap-3 rounded-xl border border-neutral-200 px-3 py-2.5 text-sm hover:bg-neutral-50"
                            >
                                <span className="flex min-w-0 items-center gap-2">
                                    <Ticket className="h-4 w-4 shrink-0 text-neutral-400" />
                                    <span className="min-w-0 truncate font-semibold">
                                        {registration.name}
                                    </span>
                                </span>
                                <span className="shrink-0 text-xs text-neutral-500">
                                    {registration.registration_category?.name}
                                </span>
                            </a>
                        ))}
                    </div>
                </div>
            </div>
        </>
    );
}
