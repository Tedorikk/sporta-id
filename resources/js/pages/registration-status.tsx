import { Head } from '@inertiajs/react';
import axios from 'axios';
import { CheckCircle2, Clock, Loader2, Users, XCircle } from 'lucide-react';
import { useState } from 'react';
import { ManualPaymentPanel } from '@/components/public/manual-payment-panel';
import { PayLinkShare } from '@/components/public/pay-link-share';
import { PublicPageHeader } from '@/components/public/public-page-header';
import { Button } from '@/components/ui/button';
import { useForceLightMode } from '@/hooks/use-force-light-mode';
import { useT } from '@/hooks/use-t';
import { formatRupiah } from '@/lib/format-currency';
import { loadSnapScript } from '@/lib/midtrans';
import type { Event } from '@/types/event';
import type { Payment } from '@/types/payment';
import type { Registration } from '@/types/registration';
import type { RegistrationCategory } from '@/types/registration-category';
import { isTeamMembersField } from '@/types/registration-category';

interface Props {
    registration: Registration & {
        event: Event;
        registration_category: RegistrationCategory;
    };
    payment: Payment | null;
}

const STATUS_COPY: Record<string, { label: string; description: string }> = {
    pending_payment: {
        label: 'Payment Pending',
        description: 'Complete your payment to confirm this registration.',
    },
    confirmed: {
        label: 'Confirmed',
        description: 'This registration is confirmed.',
    },
    rejected: {
        label: 'Rejected',
        description: 'This registration was rejected by the organizer.',
    },
    cancelled: {
        label: 'Cancelled',
        description: 'This registration was cancelled.',
    },
    expired: {
        label: 'Expired',
        description: 'This registration expired before payment was completed.',
    },
};

interface PayResponse {
    snap_token: string;
    midtrans_client_key: string;
    midtrans_is_production: boolean;
}

export default function RegistrationStatus({ registration, payment }: Props) {
    useForceLightMode();

    const { t } = useT();
    const [isPaying, setIsPaying] = useState(false);
    const isManualPayment =
        registration.registration_category.payment_method ===
        'manual_transfer';

    const copy = STATUS_COPY[registration.status] ?? STATUS_COPY.confirmed;
    const statusLabel = t(copy.label);
    const hasRoster = Boolean(registration.team);
    const isTeamMembersCategory = (
        registration.registration_category.form_pages ?? []
    ).some((page) => page.fields.some(isTeamMembersField));
    const Icon =
        registration.status === 'confirmed'
            ? CheckCircle2
            : registration.status === 'pending_payment'
              ? Clock
              : XCircle;
    const iconColor =
        registration.status === 'confirmed'
            ? 'text-green-600 bg-green-100'
            : registration.status === 'pending_payment'
              ? 'text-amber-600 bg-amber-100'
              : 'text-red-600 bg-red-100';

    const payNow = () => {
        setIsPaying(true);

        axios
            .post<PayResponse>(`/registrations/${registration.qr_token}/pay`)
            .then(({ data }) =>
                loadSnapScript(
                    data.midtrans_client_key,
                    data.midtrans_is_production,
                ).then(() => data),
            )
            .then((data) => {
                window.snap?.pay(data.snap_token, {
                    onSuccess: () => window.location.reload(),
                    onPending: () => window.location.reload(),
                    onError: () => setIsPaying(false),
                    onClose: () => setIsPaying(false),
                });
            })
            .catch(() => setIsPaying(false));
    };

    return (
        <>
            <Head
                title={t('Registration :status — :event', {
                    status: statusLabel,
                    event: registration.event.name,
                })}
            />

            <div className="relative flex min-h-screen items-center justify-center bg-paper px-4 py-10">
                <div className="relative z-10 w-full max-w-md overflow-hidden rounded-2xl border border-ink/10 bg-paper">
                    <PublicPageHeader
                        eyebrow={t('Registration')}
                        title={registration.event.name}
                        subtitle={registration.registration_category.name}
                        logoUrl={registration.event.logo}
                        accentColor={registration.event.accent_color}
                    />

                    <div className="flex flex-col items-center gap-4 px-6 py-14 text-center">
                        <div
                            className={`flex h-16 w-16 items-center justify-center rounded-full ${iconColor}`}
                        >
                            <Icon className="h-8 w-8" />
                        </div>
                        <h2 className="text-xl font-bold">{statusLabel}</h2>
                        <p className="text-neutral-600">
                            {t(copy.description)}
                        </p>
                        <p className="text-sm font-medium text-neutral-500">
                            {registration.name}
                        </p>

                        {registration.status === 'pending_payment' &&
                            isManualPayment && (
                                <ManualPaymentPanel
                                    qrToken={registration.qr_token}
                                    amount={
                                        registration.registration_category
                                            .price
                                    }
                                    instructions={
                                        registration.registration_category
                                            .form_settings
                                            ?.manual_payment_instructions
                                    }
                                    payment={payment}
                                    onSubmitted={() =>
                                        window.location.reload()
                                    }
                                />
                            )}

                        {registration.status === 'pending_payment' &&
                            !isManualPayment && (
                                <>
                                    <p className="text-2xl font-bold text-neutral-900">
                                        {formatRupiah(
                                            registration.registration_category
                                                .price,
                                        )}
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
                                        qrToken={registration.qr_token}
                                        expiresAt={registration.expires_at}
                                        message={t(
                                            'Please pay the registration fee of :price for :name (:category — :event) here:',
                                            {
                                                price: formatRupiah(
                                                    registration
                                                        .registration_category
                                                        .price,
                                                ),
                                                name: registration.name,
                                                category:
                                                    registration
                                                        .registration_category
                                                        .name,
                                                event: registration.event
                                                    .name,
                                            },
                                        )}
                                    />
                                </>
                            )}

                        {hasRoster && registration.status === 'confirmed' && (
                            <Button
                                asChild
                                className="w-full font-bold tracking-wide uppercase"
                            >
                                <a
                                    href={`/registrations/${registration.qr_token}/${isTeamMembersCategory ? 'organize-member' : 'roster'}`}
                                >
                                    <Users className="mr-2 h-4 w-4" />
                                    {isTeamMembersCategory
                                        ? t('Manage members')
                                        : t('Manage roster')}
                                </a>
                            </Button>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}
