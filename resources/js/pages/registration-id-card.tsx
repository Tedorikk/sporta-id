import { Head } from '@inertiajs/react';
import QRCode from 'qrcode';
import { useEffect, useRef, useState } from 'react';
import { APP_LOGO_URL } from '@/components/id-card/card-presets';
import { IdCardRenderer } from '@/components/id-card/id-card-renderer';
import type { IdCardData } from '@/components/id-card/id-card-renderer';
import { IdCardActions } from '@/components/id-card-actions';
import { formatImageUrl } from '@/lib/image-utils';
import type { CardTemplate } from '@/types/card-template';
import type { Registration } from '@/types/registration';

interface Props {
    registration: Registration;
    template: CardTemplate;
}

export default function RegistrationIdCard({ registration, template }: Props) {
    const cardRef = useRef<HTMLDivElement>(null);
    const [qrDataUrl, setQrDataUrl] = useState<string>('');

    const idCardUrl = `${window.location.origin}/registrations/${registration.id}/id-card`;

    useEffect(() => {
        QRCode.toDataURL(idCardUrl, {
            width: 280,
            margin: 1,
            color: { dark: '#1a1a2e', light: '#ffffff' },
            errorCorrectionLevel: 'H',
        }).then(setQrDataUrl);
    }, [idCardUrl]);

    const typeLabel = registration.registration_category?.name ?? '';

    const data: IdCardData = {
        name: registration.name,
        photo: registration.photo ?? undefined,
        typeLabel,
        organization: undefined,
        status: registration.status,
        qrDataUrl,
        eventName: registration.event?.name,
        eventLogo: registration.event?.logo ? formatImageUrl(registration.event.logo) : undefined,
        appLogo: APP_LOGO_URL,
    };

    return (
        <>
            <Head title={`${registration.name} — ${typeLabel} ID Card`} />

            <div className="flex min-h-screen items-center justify-center bg-neutral-950 px-4 py-10 print:bg-white print:p-0">
                <div
                    id="registration-id-card"
                    ref={cardRef}
                    className="overflow-hidden rounded-3xl border-2 border-black shadow-2xl print:rounded-none print:border-0 print:shadow-none"
                >
                    <IdCardRenderer template={template} data={data} />
                </div>

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
