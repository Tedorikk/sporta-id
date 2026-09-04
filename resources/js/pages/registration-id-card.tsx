import { Head } from '@inertiajs/react';
import { BadgeCheck } from 'lucide-react';
import QRCode from 'qrcode';
import { useEffect, useRef, useState } from 'react';
import { RegistrationIdCardCard } from '@/components/id-card/registration-id-card-card';
import { IdCardActions } from '@/components/id-card-actions';
import type { CardTemplate } from '@/types/card-template';
import type { Registration } from '@/types/registration';

interface Props {
    registration: Registration;
    template: CardTemplate;
}

export default function RegistrationIdCard({ registration, template }: Props) {
    const cardRef = useRef<HTMLDivElement>(null);
    const [qrDataUrl, setQrDataUrl] = useState<string>('');

    const idCardUrl = `${window.location.origin}/registrations/${registration.qr_token}/id-card`;
    const typeLabel = registration.registration_category?.name ?? '';

    useEffect(() => {
        QRCode.toDataURL(idCardUrl, {
            width: 280,
            margin: 1,
            color: { dark: '#1a1a2e', light: '#ffffff' },
            errorCorrectionLevel: 'H',
        }).then(setQrDataUrl);
    }, [idCardUrl]);

    return (
        <>
            <Head title={`${registration.name} — ${typeLabel} ID Card`} />

            <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-neutral-950 px-4 py-10 print:bg-white print:p-0">
                {/*
                 * The card's QR opens this page, so this banner is what someone
                 * working a door actually sees. It reads at arm's length and
                 * leads with the code, because the check being made is "does
                 * this match the badge in my hand" — the page only appears at
                 * all for a confirmed registration, so reaching it is itself
                 * half the answer. Hidden when printing: a printed copy of this
                 * page should be the card, not the proof.
                 */}
                <div className="w-full max-w-sm rounded-2xl bg-emerald-500 p-5 text-white shadow-2xl print:hidden">
                    <div className="flex items-center gap-3">
                        <BadgeCheck className="h-10 w-10 shrink-0" />
                        <div className="min-w-0">
                            <p className="text-2xl font-extrabold tracking-wide uppercase">
                                Verified
                            </p>
                            <p className="truncate text-sm opacity-90">
                                {registration.name}
                                {typeLabel && ` · ${typeLabel}`}
                            </p>
                        </div>
                    </div>

                    {registration.verification_code && (
                        <div className="mt-4 rounded-xl bg-white/15 px-4 py-3">
                            <p className="text-[11px] font-semibold tracking-widest uppercase opacity-80">
                                Code on the card
                            </p>
                            <p className="font-mono text-3xl font-bold tracking-[0.2em] tabular-nums">
                                {registration.verification_code}
                            </p>
                        </div>
                    )}
                </div>

                <RegistrationIdCardCard
                    registration={registration}
                    template={template}
                    qrDataUrl={qrDataUrl}
                    cardRef={cardRef}
                />

                <IdCardActions
                    targetRef={cardRef}
                    fileName={`${registration.name}-id-card`}
                    shareTitle={`${registration.name} — ${typeLabel} ID Card`}
                    shareUrl={idCardUrl}
                />
            </div>
        </>
    );
}
