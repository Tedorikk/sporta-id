import { Head } from '@inertiajs/react';
import QRCode from 'qrcode';
import { useEffect, useRef, useState } from 'react';
import { TeamIdCardCard } from '@/components/id-card/team-id-card-card';
import { IdCardActions } from '@/components/id-card-actions';
import { useT } from '@/hooks/use-t';
import type { Team } from '@/types/team';

interface Props {
    team: Team & {
        event?: { id: number; name: string };
    };
}

export default function TeamIdCard({ team }: Props) {
    const cardRef = useRef<HTMLDivElement>(null);
    const [qrDataUrl, setQrDataUrl] = useState<string>('');

    const idCardUrl = `${window.location.origin}/teams/${team.id}/id-card`;

    useEffect(() => {
        QRCode.toDataURL(idCardUrl, {
            width: 280,
            margin: 1,
            color: { dark: '#1a1a2e', light: '#ffffff' },
            errorCorrectionLevel: 'H',
        }).then(setQrDataUrl);
    }, [idCardUrl]);

    const { t } = useT();

    return (
        <>
            <Head title={t(':name — ID Card', { name: team.name })} />

            {/* Full-page background */}
            <div className="relative flex min-h-screen items-center justify-center bg-paper px-4 py-10 print:bg-ink print:p-0">
                {/* Decorative orbs */}
                <div className="pointer-events-none absolute inset-0 overflow-hidden print:hidden">
                    <div className="absolute -top-40 -left-40 h-96 w-96 rounded-full bg-poster-red/10 blur-3xl" />
                    <div className="absolute -right-40 -bottom-40 h-96 w-96 rounded-full bg-red-900/20 blur-3xl" />
                </div>

                <TeamIdCardCard
                    team={team}
                    qrDataUrl={qrDataUrl}
                    cardRef={cardRef}
                />

                <IdCardActions
                    targetRef={cardRef}
                    fileName={`${team.name}-id-card`}
                    shareTitle={`${team.name} — Sporta ID`}
                    shareUrl={idCardUrl}
                />
            </div>
        </>
    );
}
