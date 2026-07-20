import { Head } from '@inertiajs/react';
import QRCode from 'qrcode';
import { useEffect, useRef, useState } from 'react';
import AppLogoIcon from '@/components/app-logo-icon';
import { IdCardActions } from '@/components/id-card-actions';
import type { Team } from '@/types/team';

interface Props {
    team: Team & {
        event?: { id: number; name: string };
    };
}

const STATUS_STYLE = {
    verified: { label: 'Verified', bg: 'bg-emerald-500', text: 'text-white' },
    pending: { label: 'Pending', bg: 'bg-amber-400', text: 'text-amber-900' },
    rejected: { label: 'Rejected', bg: 'bg-rose-500', text: 'text-white' },
} as const;

export default function TeamIdCard({ team }: Props) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
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

    const status = STATUS_STYLE[team.status];

    return (
        <>
            <Head title={`${team.name} — ID Card`} />

            {/* Full-page background */}
            <div className="relative flex min-h-screen items-center justify-center bg-neutral-950 px-4 py-10 print:bg-white print:p-0">

                {/* Decorative orbs */}
                <div className="pointer-events-none absolute inset-0 overflow-hidden print:hidden">
                    <div className="absolute -top-40 -left-40 h-96 w-96 rounded-full bg-red-600/10 blur-3xl" />
                    <div className="absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-red-900/20 blur-3xl" />
                </div>

                {/* Card */}
                <div
                    id="team-id-card"
                    ref={cardRef}
                    className="relative z-10 w-full max-w-sm overflow-hidden rounded-3xl border-2 border-black bg-white shadow-2xl print:shadow-none print:rounded-none print:border-0"
                >
                    {/* Top gradient strip */}
                    <div className="relative h-36 overflow-hidden bg-gradient-to-br from-red-600 via-red-700 to-rose-950 print:bg-red-700">
                        {/* Pattern overlay */}
                        <svg
                            className="absolute inset-0 h-full w-full opacity-10"
                            xmlns="http://www.w3.org/2000/svg"
                        >
                            <defs>
                                <pattern id="grid" width="24" height="24" patternUnits="userSpaceOnUse">
                                    <path d="M 24 0 L 0 0 0 24" fill="none" stroke="white" strokeWidth="0.5" />
                                </pattern>
                            </defs>
                            <rect width="100%" height="100%" fill="url(#grid)" />
                        </svg>

                        {/* App branding */}
                        <div className="absolute top-4 left-5 flex items-center gap-2">
                            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-white/20">
                                <AppLogoIcon className="h-4 w-4 fill-current text-white" />
                            </div>
                            <span className="text-sm font-bold tracking-wide text-white/90">
                                Sporta ID
                            </span>
                        </div>

                        {/* Official ID badge */}
                        <div className="absolute top-4 right-5">
                            <span className="rounded-full bg-white/15 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-widest text-white/80">
                                Official ID
                            </span>
                        </div>

                    </div>

                    {/* Team logo centered on the header boundary (absolute position relative to card) */}
                    <div className="absolute top-[112px] left-1/2 z-20 -translate-x-1/2">
                        {team.logo ? (
                            <img
                                src={team.logo}
                                alt={team.name}
                                className="h-16 w-16 rounded-2xl border-4 border-white bg-white object-cover shadow-lg"
                            />
                        ) : (
                            <div className="flex h-16 w-16 items-center justify-center rounded-2xl border-4 border-white bg-gradient-to-br from-red-600 to-rose-900 text-xl font-extrabold text-white shadow-lg">
                                {team.name.substring(0, 2).toUpperCase()}
                            </div>
                        )}
                    </div>

                    {/* Card body */}
                    <div className="flex flex-col items-center gap-5 px-6 pt-12 pb-6">
                        {/* Team name & status */}
                        <div className="flex flex-col items-center gap-2 text-center">
                            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">
                                {team.name}
                            </h1>
                            <div className="flex flex-wrap items-center justify-center gap-2">
                                <span
                                    className={`rounded-full px-3 py-0.5 text-xs font-semibold ${status.bg} ${status.text}`}
                                >
                                    {status.label}
                                </span>
                                {team.basketball_event_category && (
                                    <span className="rounded-full border border-slate-200 bg-slate-100 px-3 py-0.5 text-xs font-medium text-slate-600">
                                        {team.basketball_event_category.name}
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Divider */}
                        <div className="w-full border-t border-dashed border-slate-200" />

                        {/* QR Code */}
                        <div className="flex flex-col items-center gap-2">
                            {qrDataUrl ? (
                                <div className="rounded-2xl border border-slate-100 bg-white p-3 shadow-inner">
                                    <img
                                        src={qrDataUrl}
                                        alt="Team QR Code"
                                        className="h-44 w-44"
                                        ref={canvasRef as unknown as React.RefObject<HTMLImageElement>}
                                    />
                                </div>
                            ) : (
                                <div className="flex h-52 w-52 items-center justify-center rounded-2xl bg-slate-50">
                                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-red-600" />
                                </div>
                            )}
                            <p className="text-center text-[10px] text-slate-400">
                                Scan to verify this team's identity
                            </p>
                        </div>

                        {/* Team ID */}
                        <div className="flex flex-col items-center gap-0.5">
                            <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                                Team ID
                            </span>
                            <span className="font-mono text-sm font-bold text-slate-700">
                                #{String(team.id).padStart(6, '0')}
                            </span>
                        </div>

                        {/* Footer */}
                        <div className="w-full border-t border-slate-100 pt-3 text-center text-[10px] text-slate-400">
                            Generated by{' '}
                            <span className="font-semibold text-red-600">Sporta ID</span> ·{' '}
                            {new Date().getFullYear()}
                        </div>
                    </div>
                </div>

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
