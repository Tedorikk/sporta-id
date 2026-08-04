import type { Ref } from 'react';
import { APP_LOGO_URL } from '@/components/id-card/card-presets';
import { IdCardRenderer } from '@/components/id-card/id-card-renderer';
import type { IdCardData } from '@/components/id-card/id-card-renderer';
import { formatImageUrl } from '@/lib/image-utils';
import type { CardTemplate } from '@/types/card-template';
import type { Registration } from '@/types/registration';

interface RegistrationIdCardCardProps {
    registration: Registration;
    template: CardTemplate;
    qrDataUrl: string;
    cardRef?: Ref<HTMLDivElement>;
}

/**
 * The visual registration ID card itself — extracted from registration-id-card.tsx
 * so it can be reused inline (shown immediately after registering) as well as on
 * its own standalone page.
 */
export function RegistrationIdCardCard({ registration, template, qrDataUrl, cardRef }: RegistrationIdCardCardProps) {
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
        <div
            id="registration-id-card"
            ref={cardRef}
            className="overflow-hidden rounded-3xl border-2 border-black shadow-2xl print:rounded-none print:border-0 print:shadow-none"
        >
            <IdCardRenderer template={template} data={data} />
        </div>
    );
}
