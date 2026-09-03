import { Head } from '@inertiajs/react';
import { Shield } from 'lucide-react';
import QRCode from 'qrcode';
import { useEffect, useRef, useState } from 'react';
import { IdCardActions } from '@/components/id-card-actions';
import { SiteLogo } from '@/components/landing/site-logo';
import { formatImageUrl } from '@/lib/image-utils';
import { playerRoleLabel } from '@/types/player';
import type { Player } from '@/types/player';

interface Props {
    player: Player;
}

export default function PlayerIdCard({ player }: Props) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const cardRef = useRef<HTMLDivElement>(null);
    const [qrDataUrl, setQrDataUrl] = useState<string>('');

    const idCardUrl = `${window.location.origin}/players/${player.id}/id-card`;
    const team = player.teams?.[0];

    useEffect(() => {
        QRCode.toDataURL(idCardUrl, {
            width: 280,
            margin: 1,
            color: { dark: '#1a1a2e', light: '#ffffff' },
            errorCorrectionLevel: 'H',
        }).then(setQrDataUrl);
    }, [idCardUrl]);

    const isPlayerRole = player.role === 'player';

    return (
        <>
            <Head title={`${player.name} — Player ID Card`} />

            <div className="relative flex min-h-screen items-center justify-center bg-neutral-950 px-4 py-10 print:bg-white print:p-0">
                <div className="pointer-events-none absolute inset-0 overflow-hidden print:hidden">
                    <div className="absolute -top-40 -left-40 h-96 w-96 rounded-full bg-red-600/10 blur-3xl" />
                    <div className="absolute -right-40 -bottom-40 h-96 w-96 rounded-full bg-red-900/20 blur-3xl" />
                </div>

                <div
                    id="player-id-card"
                    ref={cardRef}
                    className="relative z-10 w-full max-w-sm overflow-hidden rounded-3xl border-2 border-black bg-white shadow-2xl print:rounded-none print:border-0 print:shadow-none"
                >
                    <div className="relative h-40 overflow-hidden bg-white print:bg-white">
                        <img
                            src="/images/swoosh.svg"
                            alt=""
                            className="absolute inset-0 h-full w-full object-cover"
                        />

                        <div className="absolute inset-x-5 top-4 flex items-center justify-between">
                            <SiteLogo className="h-6 w-auto drop-shadow-sm" />
                            {team?.event?.logo && (
                                <img
                                    src={formatImageUrl(team.event.logo)}
                                    alt={team.event.name}
                                    className="h-15 w-auto drop-shadow-sm"
                                />
                            )}
                        </div>
                    </div>

                    <div className="absolute top-[124px] left-1/2 z-20 -translate-x-1/2">
                        <div className="relative">
                            {player.photo ? (
                                <img
                                    src={player.photo}
                                    alt={player.name}
                                    className="h-20 w-20 rounded-2xl border-4 border-white bg-white object-cover shadow-lg"
                                />
                            ) : (
                                <div className="flex h-20 w-20 items-center justify-center rounded-2xl border-4 border-white bg-gradient-to-br from-red-600 to-rose-900 text-2xl font-extrabold text-white shadow-lg">
                                    {player.name.substring(0, 2).toUpperCase()}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Faint watermark so the white body isn't a flat blank area */}
                    <div
                        className="pointer-events-none absolute inset-x-0 top-40 bottom-0 opacity-[0.04] print:hidden"
                        style={{
                            backgroundImage:
                                'radial-gradient(currentColor 1px, transparent 1px)',
                            backgroundSize: '14px 14px',
                            color: '#dc2626',
                        }}
                    />

                    <div className="relative flex flex-col items-center gap-5 px-6 pt-16 pb-6">
                        <div className="flex flex-col items-center gap-2 text-center">
                            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">
                                {player.name}
                            </h1>
                            <div className="flex flex-wrap items-center justify-center gap-2">
                                {!isPlayerRole && (
                                    <span className="rounded-full bg-red-600 px-3 py-0.5 text-xs font-semibold text-white">
                                        {playerRoleLabel(player.role)}
                                    </span>
                                )}
                                {isPlayerRole && player.jersey_number && (
                                    <span className="rounded-full bg-red-600 px-3 py-0.5 text-xs font-semibold text-white">
                                        #{player.jersey_number}
                                    </span>
                                )}
                                {isPlayerRole && player.position && (
                                    <span className="rounded-full border border-slate-200 bg-slate-100 px-3 py-0.5 text-xs font-medium text-slate-600">
                                        {player.position}
                                    </span>
                                )}
                            </div>
                        </div>

                        <div className="w-full border-t border-dashed border-slate-200" />

                        <div className="flex w-full items-center gap-3 rounded-xl bg-slate-50 px-4 py-3">
                            {team?.logo ? (
                                <img
                                    src={formatImageUrl(team.logo)}
                                    alt={team.name}
                                    className="h-10 w-10 shrink-0 object-cover"
                                />
                            ) : (
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-300">
                                    <Shield className="h-5 w-5" />
                                </div>
                            )}
                            <div className="flex min-w-0 flex-col gap-1">
                                <span className="text-[10px] font-semibold tracking-widest text-slate-400 uppercase">
                                    Team
                                </span>
                                <span className="truncate text-sm font-semibold text-slate-800">
                                    {team?.name ?? 'Unassigned'}
                                </span>
                                {team?.basketball_event_category && (
                                    <span className="text-xs text-slate-500">
                                        {team.basketball_event_category.name}
                                    </span>
                                )}
                            </div>
                        </div>

                        <div className="flex flex-col items-center gap-2">
                            {qrDataUrl ? (
                                <div className="relative p-2">
                                    {/* Scan-corner frame accents around the QR block */}
                                    <span className="absolute top-0 left-0 h-5 w-5 rounded-tl-lg border-t-2 border-l-2 border-red-600" />
                                    <span className="absolute top-0 right-0 h-5 w-5 rounded-tr-lg border-t-2 border-r-2 border-red-600" />
                                    <span className="absolute bottom-0 left-0 h-5 w-5 rounded-bl-lg border-b-2 border-l-2 border-red-600" />
                                    <span className="absolute right-0 bottom-0 h-5 w-5 rounded-br-lg border-r-2 border-b-2 border-red-600" />
                                    <div className="rounded-2xl border border-slate-100 bg-white p-3 shadow-inner">
                                        <img
                                            src={qrDataUrl}
                                            alt="Player QR Code"
                                            className="h-44 w-44"
                                            ref={
                                                canvasRef as unknown as React.RefObject<HTMLImageElement>
                                            }
                                        />
                                    </div>
                                </div>
                            ) : (
                                <div className="flex h-52 w-52 items-center justify-center rounded-2xl bg-slate-50">
                                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-red-600" />
                                </div>
                            )}
                            <p className="text-center text-[10px] text-slate-400">
                                Scan to verify this{' '}
                                {isPlayerRole ? 'player' : 'member'}'s identity
                            </p>
                        </div>

                        <div className="w-full border-t border-slate-100 pt-3 text-center text-[10px] text-slate-400">
                            ID Card by{' '}
                            <span className="font-semibold text-red-600">
                                Sporta Indonesia
                            </span>{' '}
                            · {new Date().getFullYear()}
                        </div>
                    </div>
                </div>

                <IdCardActions
                    targetRef={cardRef}
                    fileName={`${player.name}-id-card`}
                    shareTitle={`${player.name} — Sporta ID`}
                    shareUrl={idCardUrl}
                />
            </div>
        </>
    );
}
