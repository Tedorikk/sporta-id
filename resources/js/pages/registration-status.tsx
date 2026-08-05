import { Head } from '@inertiajs/react';
import axios from 'axios';
import { CheckCircle2, Clock, Loader2, XCircle } from 'lucide-react';
import { useState } from 'react';
import { PublicPageHeader } from '@/components/public/public-page-header';
import { Button } from '@/components/ui/button';
import { useForceLightMode } from '@/hooks/use-force-light-mode';
import { formatRupiah } from '@/lib/format-currency';
import { loadSnapScript } from '@/lib/midtrans';
import type { Event } from '@/types/event';
import type { Registration } from '@/types/registration';
import type { RegistrationCategory } from '@/types/registration-category';

interface Props {
    registration: Registration & { event: Event; registration_category: RegistrationCategory };
}

const STATUS_COPY: Record<string, { label: string; description: string }> = {
    pending_payment: { label: 'Payment Pending', description: 'Complete your payment to confirm this registration.' },
    confirmed: { label: 'Confirmed', description: 'This registration is confirmed.' },
    rejected: { label: 'Rejected', description: 'This registration was rejected by the organizer.' },
    cancelled: { label: 'Cancelled', description: 'This registration was cancelled.' },
    expired: { label: 'Expired', description: 'This registration expired before payment was completed.' },
};

interface PayResponse {
    snap_token: string;
    midtrans_client_key: string;
    midtrans_is_production: boolean;
}

export default function RegistrationStatus({ registration }: Props) {
    useForceLightMode();

    const [isPaying, setIsPaying] = useState(false);

    const copy = STATUS_COPY[registration.status] ?? STATUS_COPY.confirmed;
    const Icon = registration.status === 'confirmed' ? CheckCircle2 : registration.status === 'pending_payment' ? Clock : XCircle;
    const iconColor = registration.status === 'confirmed' ? 'text-green-600 bg-green-100' : registration.status === 'pending_payment' ? 'text-amber-600 bg-amber-100' : 'text-red-600 bg-red-100';

    const payNow = () => {
        setIsPaying(true);

        axios
            .post<PayResponse>(`/registrations/${registration.id}/pay`)
            .then(({ data }) => loadSnapScript(data.midtrans_client_key, data.midtrans_is_production).then(() => data))
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
            <Head title={`Registration ${copy.label} — ${registration.event.name}`} />

            <div className="relative flex min-h-screen items-center justify-center bg-neutral-950 px-4 py-10">
                <div className="relative z-10 w-full max-w-md overflow-hidden rounded-3xl border-2 border-black bg-white shadow-2xl">
                    <PublicPageHeader
                        eyebrow="Registration"
                        title={registration.event.name}
                        subtitle={registration.registration_category.name}
                        logoUrl={registration.event.logo}
                        accentColor={registration.event.accent_color}
                    />

                    <div className="flex flex-col items-center gap-4 px-6 py-14 text-center">
                        <div className={`flex h-16 w-16 items-center justify-center rounded-full ${iconColor}`}>
                            <Icon className="h-8 w-8" />
                        </div>
                        <h2 className="text-xl font-bold">{copy.label}</h2>
                        <p className="text-neutral-600">{copy.description}</p>
                        <p className="text-sm font-medium text-neutral-500">{registration.name}</p>

                        {registration.status === 'pending_payment' && (
                            <>
                                <p className="text-2xl font-bold text-neutral-900">{formatRupiah(registration.registration_category.price)}</p>
                                <Button type="button" onClick={payNow} disabled={isPaying} className="w-full font-bold tracking-wide uppercase">
                                    {isPaying ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                    {isPaying ? 'Opening payment…' : 'Pay Now'}
                                </Button>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}
