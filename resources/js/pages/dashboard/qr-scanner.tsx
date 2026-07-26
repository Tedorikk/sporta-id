import { Head } from '@inertiajs/react';
import { Html5Qrcode } from 'html5-qrcode';
import {
    AlertCircle,
    Calendar,
    Camera,
    CameraOff,
    CheckCircle2,
    Clock,
    FileCheck2,
    Mail,
    Phone,
    QrCode,
    Shield,
    X,
    XCircle,
    ZoomIn,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { dashboard } from '@/routes';
import type { Attendee } from '@/types/attendee';
import { playerRoleLabel } from '@/types/player';
import type { Player } from '@/types/player';
import type { Team } from '@/types/team';

type ScannedTeam = Team & {
    players: Player[];
    event?: { id: number; name: string };
};

type ScannedPlayer = Player & {
    teams?: (Team & { event?: { id: number; name: string } })[];
};

type ScannedAttendee = Attendee & {
    event?: { id: number; name: string };
};

type ScanResult =
    | { kind: 'team'; data: ScannedTeam }
    | { kind: 'player'; data: ScannedPlayer }
    | { kind: 'attendee'; data: ScannedAttendee };

const ATTENDEE_STATUS_CONFIG = {
    active: {
        label: 'Active',
        badgeVariant: 'default' as const,
        badgeClassName: 'bg-emerald-500 hover:bg-emerald-600',
        bannerClassName: 'bg-emerald-500',
        icon: CheckCircle2,
        description: 'This pass is valid for entry.',
    },
    revoked: {
        label: 'Revoked',
        badgeVariant: 'destructive' as const,
        badgeClassName: '',
        bannerClassName: 'bg-red-500',
        icon: XCircle,
        description: 'This pass has been revoked.',
    },
};

type Lightbox = { src: string; alt: string };

const STATUS_CONFIG = {
    verified: {
        label: 'Verified',
        badgeVariant: 'default' as const,
        badgeClassName: 'bg-emerald-500 hover:bg-emerald-600',
        bannerClassName: 'bg-emerald-500',
        icon: CheckCircle2,
        description: 'This team is cleared to compete.',
    },
    pending: {
        label: 'Pending',
        badgeVariant: 'secondary' as const,
        badgeClassName: '',
        bannerClassName: 'bg-amber-500',
        icon: Clock,
        description: 'Registration is still awaiting review.',
    },
    rejected: {
        label: 'Rejected',
        badgeVariant: 'destructive' as const,
        badgeClassName: '',
        bannerClassName: 'bg-red-500',
        icon: XCircle,
        description: 'This team has been disqualified.',
    },
};

function ImageLightbox({
    image,
    onClose,
}: {
    image: Lightbox;
    onClose: () => void;
}) {
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose();
            }
        };

        window.addEventListener('keydown', handleKeyDown);

        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    return (
        <div
            className="fixed inset-0 z-50 flex animate-in items-center justify-center bg-black/85 p-4 duration-150 fade-in"
            onClick={onClose}
        >
            <button
                type="button"
                onClick={onClose}
                className="absolute top-4 right-4 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
                aria-label="Close"
            >
                <X className="h-5 w-5" />
            </button>
            <img
                src={image.src}
                alt={image.alt}
                onClick={(e) => e.stopPropagation()}
                className="max-h-[88vh] max-w-[92vw] rounded-xl object-contain shadow-2xl"
            />
            <p className="absolute bottom-6 left-1/2 -translate-x-1/2 text-sm font-medium text-white/80">
                {image.alt}
            </p>
        </div>
    );
}

function ZoomableImage({
    src,
    alt,
    onOpen,
    className,
    fallback,
}: {
    src: string | null;
    alt: string;
    onOpen: (image: Lightbox) => void;
    className: string;
    fallback: React.ReactNode;
}) {
    if (!src) {
        return <div className={className}>{fallback}</div>;
    }

    return (
        <button
            type="button"
            onClick={() => onOpen({ src, alt })}
            className={cn(
                className,
                'group relative cursor-zoom-in overflow-hidden p-0',
            )}
        >
            <img
                src={src}
                alt={alt}
                className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
            />
            <span className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition-all duration-150 group-hover:bg-black/40 group-hover:opacity-100">
                <ZoomIn className="h-6 w-6 text-white" />
            </span>
        </button>
    );
}

function PlayerCard({
    player,
    onImageOpen,
    size = 'default',
}: {
    player: Player;
    onImageOpen: (image: Lightbox) => void;
    size?: 'default' | 'large';
}) {
    const isPlayerRole = player.role === 'player';
    const isLarge = size === 'large';

    return (
        <div
            className={cn(
                'flex flex-col gap-4 rounded-2xl border bg-card p-5 shadow-sm transition-shadow hover:shadow-md sm:flex-row',
                isLarge && 'p-6',
            )}
        >
            <ZoomableImage
                src={player.photo}
                alt={player.name}
                onOpen={onImageOpen}
                className={cn(
                    'shrink-0 rounded-xl',
                    isLarge
                        ? 'h-40 w-32 sm:h-44 sm:w-36'
                        : 'h-28 w-22 sm:h-32 sm:w-24',
                )}
                fallback={
                    <div className="flex h-full w-full items-center justify-center rounded-xl bg-primary/10 text-2xl font-extrabold text-primary">
                        {isPlayerRole
                            ? `#${player.jersey_number ?? '-'}`
                            : player.name.substring(0, 2).toUpperCase()}
                    </div>
                }
            />

            <div className="flex min-w-0 flex-1 flex-col gap-2">
                <div className="flex flex-wrap items-center gap-2">
                    <span
                        className={cn(
                            'font-bold',
                            isLarge ? 'text-xl' : 'text-lg',
                        )}
                    >
                        {player.name}
                    </span>
                    <Badge
                        variant="outline"
                        className="shrink-0 font-mono text-sm"
                    >
                        {isPlayerRole
                            ? `#${player.jersey_number ?? '-'}`
                            : playerRoleLabel(player.role)}
                    </Badge>
                    {player.role === 'medic' && (
                        <Badge
                            className={cn(
                                'shrink-0 gap-1 text-xs',
                                player.is_certificate_validated
                                    ? 'bg-emerald-500 hover:bg-emerald-600'
                                    : 'bg-amber-400 text-amber-900 hover:bg-amber-400',
                            )}
                        >
                            <FileCheck2 className="h-3 w-3" />
                            {player.is_certificate_validated
                                ? 'Certified'
                                : 'Pending Cert.'}
                        </Badge>
                    )}
                </div>
                {isPlayerRole && player.position && (
                    <span className="text-sm text-muted-foreground">
                        {player.position}
                    </span>
                )}

                <div className="mt-1 flex flex-col gap-1.5 text-sm text-muted-foreground">
                    <span className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 shrink-0" />
                        {player.dob ? (
                            new Date(player.dob).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                            })
                        ) : (
                            <span className="italic">DOB not set</span>
                        )}
                    </span>
                    <span className="flex items-center gap-2">
                        <Phone className="h-4 w-4 shrink-0" />
                        {player.phone_number ?? (
                            <span className="italic">Missing</span>
                        )}
                    </span>
                    <span className="flex items-center gap-2 truncate">
                        <Mail className="h-4 w-4 shrink-0" />
                        {player.email ?? (
                            <span className="italic">Missing</span>
                        )}
                    </span>
                </div>

                {player.certificate && (
                    <button
                        type="button"
                        onClick={() =>
                            onImageOpen({
                                src: player.certificate!,
                                alt: `${player.name} — Medical Certificate`,
                            })
                        }
                        className="mt-1 flex w-fit items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted"
                    >
                        <FileCheck2 className="h-3.5 w-3.5" />
                        View Certificate
                    </button>
                )}
            </div>
        </div>
    );
}

function StatusBanner({ status }: { status: Team['status'] }) {
    const config = STATUS_CONFIG[status];
    const Icon = config.icon;

    return (
        <div
            className={cn(
                'flex items-center gap-3 rounded-xl p-4 text-white shadow-sm',
                config.bannerClassName,
            )}
        >
            <Icon className="h-9 w-9 shrink-0" />
            <div>
                <p className="text-lg font-extrabold tracking-wide uppercase">
                    {config.label}
                </p>
                <p className="text-sm opacity-90">{config.description}</p>
            </div>
        </div>
    );
}

export default function QrScanner() {
    const scannerRef = useRef<Html5Qrcode | null>(null);
    const hardwareInputRef = useRef<HTMLInputElement | null>(null);

    const [scanning, setScanning] = useState(false);
    const [cameraError, setCameraError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<ScanResult | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [lastScannedText, setLastScannedText] = useState<string | null>(null);
    const [inputValue, setInputValue] = useState('');
    const [lightbox, setLightbox] = useState<Lightbox | null>(null);

    const stopScanner = useCallback(async () => {
        if (scannerRef.current?.isScanning) {
            try {
                await scannerRef.current.stop();
            } catch {
                // ignore
            }
        }

        setScanning(false);
    }, []);

    // Keep the hidden hardware-scanner input focused whenever the camera
    // isn't actively using the "focus" (scanners are just keyboard input).
    const focusHardwareInput = useCallback(() => {
        if (!scanning) {
            hardwareInputRef.current?.focus();
        }
    }, [scanning]);

    const resolveScan = useCallback(
        async (text: string) => {
            if (text === lastScannedText) {
                return;
            }

            setLastScannedText(text);

            // Extract an ID from any of the supported URL patterns.
            const teamMatch = text.match(/\/teams\/(\d+)\/id-card/);
            const playerMatch = text.match(/\/players\/(\d+)\/id-card/);
            const attendeeMatch = text.match(/\/attendees\/(\d+)\/id-card/);

            if (!teamMatch && !playerMatch && !attendeeMatch) {
                setError(
                    'Invalid QR code. Please scan a Sporta ID team, player, or attendee QR code.',
                );

                return;
            }

            const kind: 'team' | 'player' | 'attendee' = teamMatch
                ? 'team'
                : playerMatch
                  ? 'player'
                  : 'attendee';
            const id = teamMatch
                ? teamMatch[1]
                : playerMatch
                  ? playerMatch[1]
                  : attendeeMatch![1];
            const endpoint =
                kind === 'team'
                    ? `/dashboard/teams/${id}/qr-data`
                    : kind === 'player'
                      ? `/dashboard/players/${id}/qr-data`
                      : `/dashboard/attendees/${id}/qr-data`;
            const notFoundLabel =
                kind === 'team'
                    ? 'Team not found.'
                    : kind === 'player'
                      ? 'Player not found.'
                      : 'Attendee not found.';
            const disqualifiedLabel =
                kind === 'team'
                    ? 'Team has been disqualified.'
                    : kind === 'player'
                      ? "Player's team has been disqualified."
                      : 'This attendee pass has been revoked.';

            await stopScanner();
            setLoading(true);
            setError(null);
            setResult(null);

            try {
                const response = await fetch(endpoint, {
                    headers: {
                        Accept: 'application/json',
                        'X-Requested-With': 'XMLHttpRequest',
                    },
                });

                if (!response.ok) {
                    const fallback =
                        response.status === 403
                            ? disqualifiedLabel
                            : response.status === 404
                              ? notFoundLabel
                              : 'Failed to load data.';

                    let serverMessage: string | null = null;

                    try {
                        const body = await response.json();
                        serverMessage =
                            typeof body?.message === 'string'
                                ? body.message
                                : null;
                    } catch {
                        // Response wasn't JSON — fall back to the generic label below.
                    }

                    throw new Error(serverMessage ?? fallback);
                }

                const data = await response.json();
                setResult(
                    kind === 'team'
                        ? { kind: 'team', data: data as ScannedTeam }
                        : kind === 'player'
                          ? { kind: 'player', data: data as ScannedPlayer }
                          : { kind: 'attendee', data: data as ScannedAttendee },
                );
            } catch (err) {
                setError(
                    err instanceof Error
                        ? err.message
                        : 'Something went wrong.',
                );
            } finally {
                setLoading(false);
            }
        },
        [lastScannedText, stopScanner],
    );

    const handleManualInput = useCallback(
        (value: string) => {
            const trimmed = value.trim();

            if (!trimmed) {
                return;
            }

            // If it's just a number, treat it as team ID (hardware scanners always send a full URL)
            if (/^\d+$/.test(trimmed)) {
                resolveScan(
                    `${window.location.origin}/teams/${trimmed}/id-card`,
                );
            } else {
                resolveScan(trimmed);
            }
        },
        [resolveScan],
    );

    const startScanner = useCallback(async () => {
        setCameraError(null);
        setError(null);
        setResult(null);
        setLastScannedText(null);
        setScanning(true);

        try {
            if (!scannerRef.current) {
                scannerRef.current = new Html5Qrcode('qr-reader');
            }

            await scannerRef.current.start(
                { facingMode: 'environment' },
                { fps: 10, qrbox: { width: 280, height: 280 } },
                (decodedText) => {
                    resolveScan(decodedText);
                },
                undefined,
            );
        } catch (err) {
            setScanning(false);
            setCameraError(
                err instanceof Error
                    ? err.message
                    : 'Cannot access camera. Please allow camera permission.',
            );
        }
    }, [resolveScan]);

    // Re-focus the hardware-scanner input any time the result state changes,
    // so the very next scan works with zero clicks.
    useEffect(() => {
        focusHardwareInput();
    }, [focusHardwareInput, result, loading, error]);

    // If focus drifts elsewhere on the page (but the camera isn't open),
    // pull it back so a hardware scanner is always "armed".
    useEffect(() => {
        const handleWindowClick = () => {
            // Small delay so real clicks (buttons, links) register first.
            setTimeout(focusHardwareInput, 50);
        };

        window.addEventListener('click', handleWindowClick);

        return () => window.removeEventListener('click', handleWindowClick);
    }, [focusHardwareInput]);

    useEffect(() => {
        return () => {
            stopScanner();
        };
    }, [stopScanner]);

    return (
        <div className="mx-auto flex h-full w-full max-w-4xl flex-1 flex-col gap-6 px-4 py-6 md:px-8 md:py-8">
            <Head title="QR Scanner — Team & Player Lookup" />

            {lightbox && (
                <ImageLightbox
                    image={lightbox}
                    onClose={() => setLightbox(null)}
                />
            )}

            {/* Hidden always-listening input for USB/Bluetooth hardware scanners.
                Hardware scanners act like a keyboard: they type the decoded text
                into whatever has focus, then send Enter. No visible UI needed. */}
            <input
                ref={hardwareInputRef}
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        handleManualInput(inputValue);
                        setInputValue('');
                    }
                }}
                onBlur={() => {
                    setTimeout(focusHardwareInput, 50);
                }}
                autoFocus
                className="sr-only"
                aria-label="Hardware scanner input"
                tabIndex={-1}
            />

            {/* Header */}
            <div className="flex flex-col gap-1">
                <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10">
                        <QrCode className="h-6 w-6 text-primary" />
                    </div>
                    <h1 className="text-3xl font-extrabold tracking-tight">
                        QR Scanner
                    </h1>
                </div>
                <p className="text-sm text-muted-foreground">
                    Ready to scan — point a hardware scanner at a team's,
                    player's, or attendee's QR code, or press{' '}
                    <span className="font-medium text-foreground">
                        Start Scanning
                    </span>{' '}
                    to use your camera.
                </p>
            </div>

            {/* Scanner card */}
            <div className="rounded-xl border bg-card shadow-sm">
                <div className="border-b p-4">
                    <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-muted-foreground">
                            Camera Scanner
                        </span>
                        <div className="flex gap-2">
                            {!scanning ? (
                                <Button onClick={startScanner} size="lg">
                                    <Camera className="mr-2 h-5 w-5" />
                                    Start Scanning
                                </Button>
                            ) : (
                                <Button
                                    onClick={stopScanner}
                                    size="lg"
                                    variant="outline"
                                >
                                    <CameraOff className="mr-2 h-5 w-5" />
                                    Stop
                                </Button>
                            )}
                        </div>
                    </div>
                </div>

                <div className="p-4">
                    {/* QR reader element — always in the DOM so Html5Qrcode can mount */}
                    <div
                        id="qr-reader"
                        className={
                            scanning
                                ? 'mx-auto max-w-md overflow-hidden rounded-lg'
                                : 'hidden'
                        }
                    />

                    {!scanning && !loading && !result && (
                        <div className="flex flex-col items-center justify-center gap-3 py-14 text-center text-muted-foreground">
                            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted">
                                <QrCode className="h-10 w-10" />
                            </div>
                            <p className="text-base">
                                Hardware scanners work automatically — just scan
                                a team, player, or attendee QR code.
                                <br />
                                No camera? Press{' '}
                                <span className="font-semibold text-foreground">
                                    Start Scanning
                                </span>{' '}
                                to use your device's camera instead.
                            </p>
                        </div>
                    )}

                    {cameraError && (
                        <div className="flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
                            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                            {cameraError}
                        </div>
                    )}

                    {error && (
                        <div className="flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-base text-destructive">
                            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
                            {error}
                            <Button
                                variant="ghost"
                                size="sm"
                                className="ml-auto h-auto p-0 text-xs underline"
                                onClick={startScanner}
                            >
                                Try again
                            </Button>
                        </div>
                    )}

                    {loading && (
                        <div className="flex flex-col items-center gap-3 py-10">
                            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
                            <p className="text-sm text-muted-foreground">
                                Loading data…
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* Team result */}
            {result?.kind === 'team' && (
                <div className="flex animate-in flex-col gap-4 duration-500 fade-in slide-in-from-bottom-4">
                    <StatusBanner status={result.data.status} />

                    {/* Team header */}
                    <div className="flex flex-col gap-4 rounded-xl border bg-card p-6 shadow-sm">
                        <div className="flex items-start gap-5">
                            <ZoomableImage
                                src={result.data.logo}
                                alt={result.data.name}
                                onOpen={setLightbox}
                                className="h-24 w-24 shrink-0 rounded-xl shadow"
                                fallback={
                                    <div className="flex h-full w-full items-center justify-center rounded-xl bg-primary/10 text-2xl font-extrabold text-primary shadow">
                                        {result.data.name
                                            .substring(0, 2)
                                            .toUpperCase()}
                                    </div>
                                }
                            />
                            <div className="flex flex-1 flex-col gap-1.5">
                                <div className="flex flex-wrap items-center gap-2">
                                    <h2 className="text-2xl font-extrabold tracking-tight">
                                        {result.data.name}
                                    </h2>
                                    <Badge
                                        variant={
                                            STATUS_CONFIG[result.data.status]
                                                .badgeVariant
                                        }
                                        className={
                                            STATUS_CONFIG[result.data.status]
                                                .badgeClassName
                                        }
                                    >
                                        <CheckCircle2 className="mr-1 h-3 w-3" />
                                        {
                                            STATUS_CONFIG[result.data.status]
                                                .label
                                        }
                                    </Badge>
                                    {result.data.basketball_event_category && (
                                        <Badge variant="secondary">
                                            {
                                                result.data
                                                    .basketball_event_category
                                                    .name
                                            }
                                        </Badge>
                                    )}
                                </div>
                                {result.data.event && (
                                    <p className="text-sm text-muted-foreground">
                                        {result.data.event.name}
                                    </p>
                                )}
                            </div>
                        </div>

                        <div className="flex items-center gap-2 rounded-lg bg-emerald-50 p-3 dark:bg-emerald-950/30">
                            <Shield className="h-4 w-4 shrink-0 text-emerald-600" />
                            <span className="text-sm text-emerald-700 dark:text-emerald-400">
                                {result.data.players.length} registered player
                                {result.data.players.length !== 1 ? 's' : ''}
                            </span>
                            <Button
                                size="sm"
                                variant="outline"
                                className="ml-auto text-xs"
                                onClick={startScanner}
                            >
                                Scan another
                            </Button>
                        </div>
                    </div>

                    {/* Players grid */}
                    {result.data.players.length > 0 && (
                        <div className="flex flex-col gap-3">
                            <h3 className="text-lg font-semibold tracking-tight">
                                Player Roster ({result.data.players.length})
                            </h3>
                            <div className="grid gap-4 lg:grid-cols-2">
                                {result.data.players.map((player) => (
                                    <PlayerCard
                                        key={player.id}
                                        player={player}
                                        onImageOpen={setLightbox}
                                    />
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Player result */}
            {result?.kind === 'player' && (
                <div className="flex animate-in flex-col gap-4 duration-500 fade-in slide-in-from-bottom-4">
                    {result.data.teams?.[0] && (
                        <StatusBanner status={result.data.teams[0].status} />
                    )}

                    <div className="flex flex-col gap-4 rounded-xl border bg-card p-6 shadow-sm">
                        <PlayerCard
                            player={result.data}
                            onImageOpen={setLightbox}
                            size="large"
                        />

                        {(() => {
                            const team = result.data.teams?.[0];

                            return (
                                <div className="flex flex-wrap items-center gap-2 rounded-lg bg-slate-50 p-3 dark:bg-slate-900/40">
                                    {team && (
                                        <>
                                            <Badge
                                                variant={
                                                    STATUS_CONFIG[team.status]
                                                        .badgeVariant
                                                }
                                                className={
                                                    STATUS_CONFIG[team.status]
                                                        .badgeClassName
                                                }
                                            >
                                                <CheckCircle2 className="mr-1 h-3 w-3" />
                                                {
                                                    STATUS_CONFIG[team.status]
                                                        .label
                                                }
                                            </Badge>
                                            <span className="text-sm text-muted-foreground">
                                                Team:{' '}
                                                <span className="font-medium text-foreground">
                                                    {team.name}
                                                </span>
                                            </span>
                                            {team.basketball_event_category && (
                                                <Badge variant="secondary">
                                                    {
                                                        team
                                                            .basketball_event_category
                                                            .name
                                                    }
                                                </Badge>
                                            )}
                                        </>
                                    )}
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        className="ml-auto text-xs"
                                        onClick={startScanner}
                                    >
                                        Scan another
                                    </Button>
                                </div>
                            );
                        })()}
                    </div>
                </div>
            )}

            {/* Attendee result */}
            {result?.kind === 'attendee' && (
                <div className="flex animate-in flex-col gap-4 duration-500 fade-in slide-in-from-bottom-4">
                    {(() => {
                        const config = ATTENDEE_STATUS_CONFIG[result.data.status];
                        const Icon = config.icon;

                        return (
                            <div
                                className={cn(
                                    'flex items-center gap-3 rounded-xl p-4 text-white shadow-sm',
                                    config.bannerClassName,
                                )}
                            >
                                <Icon className="h-9 w-9 shrink-0" />
                                <div>
                                    <p className="text-lg font-extrabold tracking-wide uppercase">
                                        {config.label}
                                    </p>
                                    <p className="text-sm opacity-90">{config.description}</p>
                                </div>
                            </div>
                        );
                    })()}

                    <div className="flex flex-col gap-4 rounded-xl border bg-card p-6 shadow-sm">
                        <div className="flex items-start gap-5">
                            <ZoomableImage
                                src={result.data.photo}
                                alt={result.data.name}
                                onOpen={setLightbox}
                                className="h-24 w-24 shrink-0 rounded-xl shadow"
                                fallback={
                                    <div className="flex h-full w-full items-center justify-center rounded-xl bg-primary/10 text-2xl font-extrabold text-primary shadow">
                                        {result.data.name.substring(0, 2).toUpperCase()}
                                    </div>
                                }
                            />
                            <div className="flex flex-1 flex-col gap-1.5">
                                <div className="flex flex-wrap items-center gap-2">
                                    <h2 className="text-2xl font-extrabold tracking-tight">
                                        {result.data.name}
                                    </h2>
                                    {result.data.attendee_type && (
                                        <Badge variant="secondary">
                                            {result.data.attendee_type.label}
                                        </Badge>
                                    )}
                                </div>
                                {result.data.organization && (
                                    <p className="text-sm text-muted-foreground">
                                        {result.data.organization}
                                        {result.data.title ? ` · ${result.data.title}` : ''}
                                    </p>
                                )}
                                {result.data.event && (
                                    <p className="text-sm text-muted-foreground">
                                        {result.data.event.name}
                                    </p>
                                )}
                            </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 rounded-lg bg-slate-50 p-3 dark:bg-slate-900/40">
                            {result.data.email && (
                                <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                                    <Mail className="h-4 w-4 shrink-0" />
                                    {result.data.email}
                                </span>
                            )}
                            {result.data.phone && (
                                <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                                    <Phone className="h-4 w-4 shrink-0" />
                                    {result.data.phone}
                                </span>
                            )}
                            <Button
                                size="sm"
                                variant="outline"
                                className="ml-auto text-xs"
                                onClick={startScanner}
                            >
                                Scan another
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

QrScanner.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: dashboard() },
        { title: 'QR Scanner', href: '/dashboard/qr-scanner' },
    ],
};
