import { Head } from '@inertiajs/react';
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

            <div className="flex min-h-screen items-center justify-center bg-neutral-950 px-4 py-10 print:bg-white print:p-0">
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
