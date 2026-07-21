import { Head } from '@inertiajs/react';
import { Html5Qrcode } from 'html5-qrcode';
import {
    AlertCircle,
    Calendar,
    Camera,
    CheckCircle2,
    CameraOff,
    Mail,
    Phone,
    QrCode,
    Shield,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { dashboard } from '@/routes';
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

type ScanResult =
    | { kind: 'team'; data: ScannedTeam }
    | { kind: 'player'; data: ScannedPlayer };

const STATUS_CONFIG = {
    verified: { label: 'Verified', variant: 'default' as const, className: 'bg-emerald-500 hover:bg-emerald-600' },
    pending: { label: 'Pending', variant: 'secondary' as const, className: '' },
    rejected: { label: 'Rejected', variant: 'destructive' as const, className: '' },
};

function PlayerCard({ player }: { player: Player }) {
    const isPlayerRole = player.role === 'player';

    return (
        <div className="flex items-start gap-3 rounded-xl border bg-card p-4 shadow-sm transition-shadow hover:shadow-md">
            {player.photo ? (
                <img
                    src={player.photo}
                    alt={player.name}
                    className="h-16 w-12 shrink-0 rounded-lg object-cover"
                />
            ) : (
                <div className="flex h-16 w-12 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-lg font-extrabold text-primary">
                    {isPlayerRole ? `#${player.jersey_number}` : player.name.substring(0, 2).toUpperCase()}
                </div>
            )}
            <div className="flex min-w-0 flex-1 flex-col gap-1">
                <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-semibold">{player.name}</span>
                    <Badge variant="outline" className="shrink-0 font-mono text-xs">
                        {isPlayerRole ? `#${player.jersey_number}` : playerRoleLabel(player.role)}
                    </Badge>
                    {player.role === 'medic' && !player.is_certificate_validated && (
                        <Badge className="shrink-0 bg-amber-400 text-xs text-amber-900 hover:bg-amber-400">
                            Pending
                        </Badge>
                    )}
                </div>
                {player.position && (
                    <span className="text-xs text-muted-foreground">{player.position}</span>
                )}
                <div className="mt-1 flex flex-col gap-0.5 text-xs text-muted-foreground">
                    {player.dob && (
                        <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3 shrink-0" />
                            {new Date(player.dob).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                            })}
                        </span>
                    )}
                    {player.phone_number && (
                        <span className="flex items-center gap-1">
                            <Phone className="h-3 w-3 shrink-0" />
                            {player.phone_number}
                        </span>
                    )}
                    {player.email && (
                        <span className="flex items-center gap-1 truncate">
                            <Mail className="h-3 w-3 shrink-0" />
                            {player.email}
                        </span>
                    )}
                </div>
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

    const resolveScan = useCallback(async (text: string) => {
        if (text === lastScannedText) {
            return;
        }

        setLastScannedText(text);

        // Extract an ID from either URL pattern: /teams/{id}/id-card or /players/{id}/id-card
        const teamMatch = text.match(/\/teams\/(\d+)\/id-card/);
        const playerMatch = text.match(/\/players\/(\d+)\/id-card/);

        if (!teamMatch && !playerMatch) {
            setError('Invalid QR code. Please scan a Sporta ID team or player QR code.');

            return;
        }

        const kind: 'team' | 'player' = teamMatch ? 'team' : 'player';
        const id = teamMatch ? teamMatch[1] : playerMatch![1];
        const endpoint = kind === 'team' ? `/dashboard/teams/${id}/qr-data` : `/dashboard/players/${id}/qr-data`;
        const notFoundLabel = kind === 'team' ? 'Team not found.' : 'Player not found.';
        const disqualifiedLabel = kind === 'team' ? 'Team has been disqualified.' : "Player's team has been disqualified.";

        await stopScanner();
        setLoading(true);
        setError(null);
        setResult(null);

        try {
            const response = await fetch(endpoint, {
                headers: { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
            });

            if (!response.ok) {
                const fallback = response.status === 403
                    ? disqualifiedLabel
                    : response.status === 404
                        ? notFoundLabel
                        : 'Failed to load data.';

                let serverMessage: string | null = null;

                try {
                    const body = await response.json();
                    serverMessage = typeof body?.message === 'string' ? body.message : null;
                } catch {
                    // Response wasn't JSON — fall back to the generic label below.
                }

                throw new Error(serverMessage ?? fallback);
            }

            const data = await response.json();
            setResult(
                kind === 'team'
                    ? { kind: 'team', data: data as ScannedTeam }
                    : { kind: 'player', data: data as ScannedPlayer },
            );
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Something went wrong.');
        } finally {
            setLoading(false);
        }
    }, [lastScannedText, stopScanner]);

    const handleManualInput = useCallback((value: string) => {
        const trimmed = value.trim();
        if (!trimmed) return;

        // If it's just a number, treat it as team ID (hardware scanners always send a full URL)
        if (/^\d+$/.test(trimmed)) {
            resolveScan(`${window.location.origin}/teams/${trimmed}/id-card`);
        } else {
            resolveScan(trimmed);
        }
    }, [resolveScan]);

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
                { fps: 10, qrbox: { width: 250, height: 250 } },
                (decodedText) => {
                    resolveScan(decodedText);
                },
                undefined,
            );
        } catch (err) {
            setScanning(false);
            setCameraError(err instanceof Error ? err.message : 'Cannot access camera. Please allow camera permission.');
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
        <div className="mx-auto flex h-full w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-6 md:px-8 md:py-8">
            <Head title="QR Scanner — Team & Player Lookup" />

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
                <div className="flex items-center gap-2">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                        <QrCode className="h-5 w-5 text-primary" />
                    </div>
                    <h1 className="text-2xl font-extrabold tracking-tight">QR Scanner</h1>
                </div>
                <p className="text-sm text-muted-foreground">
                    Ready to scan — point a hardware scanner at a team's or player's QR code, or press{' '}
                    <span className="font-medium text-foreground">Start Scanning</span> to use your camera.
                </p>
            </div>

            {/* Scanner card */}
            <div className="rounded-xl border bg-card shadow-sm">
                <div className="border-b p-4">
                    <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-muted-foreground">Camera Scanner</span>
                        <div className="flex gap-2">
                            {!scanning ? (
                                <Button onClick={startScanner} size="sm">
                                    <Camera className="mr-2 h-4 w-4" />
                                    Start Scanning
                                </Button>
                            ) : (
                                <Button onClick={stopScanner} size="sm" variant="outline">
                                    <CameraOff className="mr-2 h-4 w-4" />
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
                        className={scanning ? 'overflow-hidden rounded-lg' : 'hidden'}
                    />

                    {!scanning && !loading && !result && (
                        <div className="flex flex-col items-center justify-center gap-3 py-12 text-center text-muted-foreground">
                            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                                <QrCode className="h-8 w-8" />
                            </div>
                            <p className="text-sm">
                                Hardware scanners work automatically — just scan a team or player QR code.
                                <br />
                                No camera? Press{' '}
                                <span className="font-semibold text-foreground">Start Scanning</span>{' '}
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
                        <div className="flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
                            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
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
                            <p className="text-sm text-muted-foreground">Loading data…</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Team result */}
            {result?.kind === 'team' && (
                <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    {/* Team header */}
                    <div className="flex flex-col gap-4 rounded-xl border bg-card p-6 shadow-sm">
                        <div className="flex items-start gap-4">
                            {result.data.logo ? (
                                <img
                                    src={result.data.logo}
                                    alt={result.data.name}
                                    className="h-16 w-16 shrink-0 rounded-xl object-cover shadow"
                                />
                            ) : (
                                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-xl font-extrabold text-primary shadow">
                                    {result.data.name.substring(0, 2).toUpperCase()}
                                </div>
                            )}
                            <div className="flex flex-1 flex-col gap-1">
                                <div className="flex flex-wrap items-center gap-2">
                                    <h2 className="text-xl font-extrabold tracking-tight">{result.data.name}</h2>
                                    <Badge
                                        variant={STATUS_CONFIG[result.data.status].variant}
                                        className={STATUS_CONFIG[result.data.status].className}
                                    >
                                        <CheckCircle2 className="mr-1 h-3 w-3" />
                                        {STATUS_CONFIG[result.data.status].label}
                                    </Badge>
                                    {result.data.basketball_event_category && (
                                        <Badge variant="secondary">
                                            {result.data.basketball_event_category.name}
                                        </Badge>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 rounded-lg bg-emerald-50 p-3 dark:bg-emerald-950/30">
                            <Shield className="h-4 w-4 shrink-0 text-emerald-600" />
                            <span className="text-xs text-emerald-700 dark:text-emerald-400">
                                {result.data.players.length} registered player{result.data.players.length !== 1 ? 's' : ''}
                            </span>
                            <Button
                                size="sm"
                                variant="outline"
                                className="ml-auto h-7 text-xs"
                                onClick={startScanner}
                            >
                                Scan another
                            </Button>
                        </div>
                    </div>

                    {/* Players grid */}
                    {result.data.players.length > 0 && (
                        <div className="flex flex-col gap-3">
                            <h3 className="text-base font-semibold tracking-tight">Player Roster</h3>
                            <div className="grid gap-3 sm:grid-cols-2">
                                {result.data.players.map((player) => (
                                    <PlayerCard key={player.id} player={player} />
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Player result */}
            {result?.kind === 'player' && (
                <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="flex flex-col gap-4 rounded-xl border bg-card p-6 shadow-sm">
                        <div className="flex items-start gap-4">
                            <PlayerCard player={result.data} />
                        </div>

                        {(() => {
                            const team = result.data.teams?.[0];

                            return (
                                <div className="flex flex-wrap items-center gap-2 rounded-lg bg-slate-50 p-3 dark:bg-slate-900/40">
                                    {team && (
                                        <>
                                            <Badge
                                                variant={STATUS_CONFIG[team.status].variant}
                                                className={STATUS_CONFIG[team.status].className}
                                            >
                                                <CheckCircle2 className="mr-1 h-3 w-3" />
                                                {STATUS_CONFIG[team.status].label}
                                            </Badge>
                                            <span className="text-xs text-muted-foreground">
                                                Team: <span className="font-medium text-foreground">{team.name}</span>
                                            </span>
                                            {team.basketball_event_category && (
                                                <Badge variant="secondary">
                                                    {team.basketball_event_category.name}
                                                </Badge>
                                            )}
                                        </>
                                    )}
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        className="ml-auto h-7 text-xs"
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
        </div>
    );
}

QrScanner.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: dashboard() },
        { title: 'QR Scanner', href: '/dashboard/qr-scanner' },
    ],
};