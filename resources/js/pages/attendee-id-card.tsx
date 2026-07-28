import { Head } from '@inertiajs/react';
import QRCode from 'qrcode';
import { useEffect, useRef, useState } from 'react';
import { APP_LOGO_URL } from '@/components/id-card/card-presets';
import { IdCardRenderer } from '@/components/id-card/id-card-renderer';
import type { IdCardData } from '@/components/id-card/id-card-renderer';
import { IdCardActions } from '@/components/id-card-actions';
import { formatImageUrl } from '@/lib/image-utils';
import type { Attendee } from '@/types/attendee';
import type { CardTemplate } from '@/types/card-template';

interface Props {
    attendee: Attendee;
    template: CardTemplate;
}

export default function AttendeeIdCard({ attendee, template }: Props) {
    const cardRef = useRef<HTMLDivElement>(null);
    const [qrDataUrl, setQrDataUrl] = useState<string>('');

    const idCardUrl = `${window.location.origin}/attendees/${attendee.id}/id-card`;

    useEffect(() => {
        QRCode.toDataURL(idCardUrl, {
            width: 280,
            margin: 1,
            color: { dark: '#1a1a2e', light: '#ffffff' },
            errorCorrectionLevel: 'H',
        }).then(setQrDataUrl);
    }, [idCardUrl]);

    const typeLabel = attendee.attendee_type?.label ?? '';

    const data: IdCardData = {
        name: attendee.name,
        photo: attendee.photo ?? undefined,
        typeLabel,
        organization: attendee.organization ?? undefined,
        title: attendee.title ?? undefined,
        status: attendee.status,
        qrDataUrl,
        eventName: attendee.event?.name,
        eventLogo: attendee.event?.logo ? formatImageUrl(attendee.event.logo) : undefined,
        appLogo: APP_LOGO_URL,
    };

    return (
        <>
            <Head title={`${attendee.name} — ${typeLabel} ID Card`} />

            <div className="flex min-h-screen items-center justify-center bg-neutral-950 px-4 py-10 print:bg-white print:p-0">
                <div
                    id="attendee-id-card"
                    ref={cardRef}
                    className="overflow-hidden rounded-3xl border-2 border-black shadow-2xl print:rounded-none print:border-0 print:shadow-none"
                >
                    <IdCardRenderer template={template} data={data} />
                </div>

                <IdCardActions
                    targetRef={cardRef}
                    fileName={`${attendee.name}-id-card`}
                    shareTitle={`${attendee.name} — ${typeLabel} ID Card`}
                    shareUrl={idCardUrl}
                />
            </div>
        </>
    );
}
