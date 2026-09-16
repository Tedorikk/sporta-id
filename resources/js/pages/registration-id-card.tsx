import { Head } from '@inertiajs/react';
import QRCode from 'qrcode';
import { useEffect, useRef, useState } from 'react';
import { RegistrationIdCardCard } from '@/components/id-card/registration-id-card-card';
import { VerifiedBanner } from '@/components/id-card/verified-banner';
import { IdCardActions } from '@/components/id-card-actions';
import { useT } from '@/hooks/use-t';
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
    const { t } = useT();
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
            <Head
                title={t(':name — :type ID Card', {
                    name: registration.name,
                    type: typeLabel,
                })}
            />

            <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-neutral-950 px-4 py-10 print:bg-white print:p-0">
                {/*
                 * This page 404s for anything but a confirmed registration, so
                 * reaching it is already half the answer; the code is the other
                 * half, checked against the badge in the reader's hand.
                 */}
                <VerifiedBanner
                    valid
                    name={registration.name}
                    subtitle={typeLabel}
                    code={registration.verification_code}
                />

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
