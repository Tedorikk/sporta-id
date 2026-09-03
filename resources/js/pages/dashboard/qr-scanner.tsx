import { Head } from '@inertiajs/react';
import axios from 'axios';
import { Html5Qrcode } from 'html5-qrcode';
import {
    AlertCircle,
    Calendar,
    Camera,
    CameraOff,
    CalendarX,
    CheckCircle2,
    Clock,
    FileCheck2,
    Mail,
    MapPin,
    Phone,
    QrCode,
    Shield,
    UserCheck,
    XCircle,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    playErrorTone,
    playNoticeTone,
    playSuccessTone,
} from '@/lib/scan-sound';
import { cn } from '@/lib/utils';
import { MeetingCombobox } from '@/pages/dashboard/components/qr-scanner/meeting-combobox';
import { RecentScansList } from '@/pages/dashboard/components/qr-scanner/recent-scans-list';
import type {
    ScanHistoryEntry,
    ScanHistoryVariant,
} from '@/pages/dashboard/components/qr-scanner/recent-scans-list';
import { ResultBanner } from '@/pages/dashboard/components/qr-scanner/result-banner';
import type { ResultBannerVariant } from '@/pages/dashboard/components/qr-scanner/result-banner';
import { ResultContactFooter } from '@/pages/dashboard/components/qr-scanner/result-contact-footer';
import { ResultPersonHeader } from '@/pages/dashboard/components/qr-scanner/result-person-header';
import {
    ImageLightbox,
    ZoomableImage,
} from '@/pages/dashboard/components/qr-scanner/zoomable-image';
import type { Lightbox } from '@/pages/dashboard/components/qr-scanner/zoomable-image';
import {
    StatusBadge,
    ROUND_LABELS,
} from '@/pages/dashboard/events/basketball/matches/components/constants';
import { dashboard } from '@/routes';
import type { Attendee } from '@/types/attendee';
import type { GameMatch } from '@/types/game-match';
import type { Meeting } from '@/types/meeting';
import { playerRoleLabel } from '@/types/player';
import type { Player } from '@/types/player';
import type { Registration } from '@/types/registration';
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

type ScannedRegistration = Registration & {
    event?: { id: number; name: string };
};

type CheckInResult = { meetingTitle: string; alreadyCheckedIn: boolean };

type ScanResult =
    | { kind: 'team'; data: ScannedTeam }
    | { kind: 'player'; data: ScannedPlayer }
    | { kind: 'attendee'; data: ScannedAttendee }
    | {
          kind: 'registration';
          data: ScannedRegistration;
          checkIn: CheckInResult | null;
      };

interface Props {
    meetings: Meeting[];
    preselectedMeeting: Meeting | null;
}

interface StatusPresentation {
    label: string;
    badgeVariant: 'default' | 'secondary' | 'destructive';
    badgeClassName: string;
    variant: ResultBannerVariant;
    icon: LucideIcon;
    description: string;
}

const ATTENDEE_STATUS_CONFIG: Record<Attendee['status'], StatusPresentation> = {
    active: {
        label: 'Active',
        badgeVariant: 'default',
        badgeClassName: 'bg-emerald-500 hover:bg-emerald-600',
        variant: 'success',
        icon: CheckCircle2,
        description: 'This pass is valid for entry.',
    },
    revoked: {
        label: 'Revoked',
        badgeVariant: 'destructive',
        badgeClassName: '',
        variant: 'danger',
        icon: XCircle,
        description: 'This pass has been revoked.',
    },
};

const STATUS_CONFIG: Record<Team['status'], StatusPresentation> = {
    verified: {
        label: 'Verified',
        badgeVariant: 'default',
        badgeClassName: 'bg-emerald-500 hover:bg-emerald-600',
        variant: 'success',
        icon: CheckCircle2,
        description: 'This team is cleared to compete.',
    },
    pending: {
        label: 'Pending',
        badgeVariant: 'secondary',
        badgeClassName: '',
        variant: 'warning',
        icon: Clock,
        description: 'Registration is still awaiting review.',
    },
    rejected: {
        label: 'Rejected',
        badgeVariant: 'destructive',
        badgeClassName: '',
        variant: 'danger',
        icon: XCircle,
        description: 'This team has been disqualified.',
    },
};

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
                'flex flex-col gap-5 rounded-2xl border bg-card p-6 shadow-sm transition-shadow hover:shadow-md sm:flex-row',
                isLarge && 'p-7',
            )}
        >
            <ZoomableImage
                src={player.photo}
                alt={player.name}
                onOpen={onImageOpen}
                className={cn(
                    'shrink-0 rounded-xl',
                    isLarge
                        ? 'h-52 w-40 sm:h-60 sm:w-48'
                        : 'h-36 w-28 sm:h-40 sm:w-32',
                )}
                fallback={
                    <div
                        className={cn(
                            'flex h-full w-full items-center justify-center rounded-xl bg-primary/10 font-extrabold text-primary',
                            isLarge ? 'text-4xl' : 'text-3xl',
                        )}
                    >
                        {isPlayerRole
                            ? `#${player.jersey_number ?? '-'}`
                            : player.name.substring(0, 2).toUpperCase()}
                    </div>
                }
            />

            <div className="flex min-w-0 flex-1 flex-col gap-2.5">
                <div className="flex flex-wrap items-center gap-2.5">
                    <span
                        className={cn(
                            'font-bold',
                            isLarge ? 'text-3xl' : 'text-2xl',
                        )}
                    >
                        {player.name}
                    </span>
                    <Badge
                        variant="outline"
                        className="shrink-0 px-2.5 py-1 font-mono text-base"
                    >
                        {isPlayerRole
                            ? `#${player.jersey_number ?? '-'}`
                            : playerRoleLabel(player.role)}
                    </Badge>
                    {player.role === 'medic' && (
                        <Badge
                            className={cn(
                                'shrink-0 gap-1 px-2.5 py-1 text-sm',
                                player.is_certificate_validated
                                    ? 'bg-emerald-500 hover:bg-emerald-600'
                                    : 'bg-amber-400 text-amber-900 hover:bg-amber-400',
                            )}
                        >
                            <FileCheck2 className="h-3.5 w-3.5" />
                            {player.is_certificate_validated
                                ? 'Certified'
                                : 'Pending Cert.'}
                        </Badge>
                    )}
                </div>
                {isPlayerRole && player.position && (
                    <span className="text-base text-muted-foreground">
                        {player.position}
                    </span>
                )}

                <div className="mt-1 flex flex-col gap-2 text-base text-muted-foreground">
                    <span className="flex items-center gap-2.5">
                        <Calendar className="h-5 w-5 shrink-0" />
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
                    <span className="flex items-center gap-2.5">
                        <Phone className="h-5 w-5 shrink-0" />
                        {player.phone_number ?? (
                            <span className="italic">Missing</span>
                        )}
                    </span>
                    <span className="flex items-center gap-2.5 truncate">
                        <Mail className="h-5 w-5 shrink-0" />
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
                        className="mt-1 flex w-fit items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted"
                    >
                        <FileCheck2 className="h-4 w-4" />
                        View Certificate
                    </button>
                )}
            </div>
        </div>
    );
}

function NextMatchCard({
    match,
    teamId,
}: {
    match: GameMatch | null | undefined;
    teamId: number;
}) {
    if (!match) {
        return (
            <div className="flex items-center gap-3 rounded-xl border border-dashed bg-muted/30 p-4">
                <CalendarX className="h-6 w-6 shrink-0 text-muted-foreground" />
                <div>
                    <p className="text-base font-semibold">
                        No more matches today
                    </p>
                    <p className="text-sm text-muted-foreground">
                        This team has no further matches scheduled for today.
                    </p>
                </div>
            </div>
        );
    }

    const isHome = match.home_team_id === teamId;
    const opponent = isHome ? match.away_team : match.home_team;
    const time = match.scheduled_at
        ? new Date(match.scheduled_at).toLocaleTimeString([], {
              hour: 'numeric',
              minute: '2-digit',
          })
        : null;

    return (
        <div className="flex flex-col gap-3 rounded-xl border bg-card p-5 shadow-sm">
            <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-muted-foreground">
                    Next Match Today
                </span>
                <StatusBadge status={match.status} />
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-col gap-1">
                    <span className="text-xl font-bold">
                        vs {opponent?.name ?? 'TBD'}
                    </span>
                    <span className="text-sm text-muted-foreground">
                        {match.round
                            ? (ROUND_LABELS[match.round] ?? match.round)
                            : ''}
                        {match.pool ? ` · ${match.pool.name}` : ''}
                    </span>
                </div>
                <div className="flex flex-col items-end gap-1.5">
                    {time && (
                        <span className="flex items-center gap-1.5 text-lg font-semibold">
                            <Clock className="h-5 w-5" />
                            {time}
                        </span>
                    )}
                    {match.venue && (
                        <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                            <MapPin className="h-4 w-4" />
                            {match.venue}
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
}

function registrationBanner(
    result: Extract<ScanResult, { kind: 'registration' }>,
) {
    if (result.checkIn) {
        return result.checkIn.alreadyCheckedIn
            ? {
                  variant: 'warning' as ResultBannerVariant,
                  icon: UserCheck,
                  title: 'Already Checked In',
                  subtitle: `${result.data.name} — ${result.checkIn.meetingTitle}`,
              }
            : {
                  variant: 'success' as ResultBannerVariant,
                  icon: UserCheck,
                  title: 'Checked In',
                  subtitle: `${result.data.name} — ${result.checkIn.meetingTitle}`,
              };
    }

    return {
        variant: 'success' as ResultBannerVariant,
        icon: CheckCircle2,
        title: 'Confirmed',
        subtitle: 'This registration is confirmed.',
    };
}

export default function QrScanner({ meetings, preselectedMeeting }: Props) {
    const scannerRef = useRef<Html5Qrcode | null>(null);
    const hardwareInputRef = useRef<HTMLInputElement | null>(null);

    const [scanning, setScanning] = useState(false);
    const [hasUsedCamera, setHasUsedCamera] = useState(false);
    const [cameraError, setCameraError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<ScanResult | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [lastScannedText, setLastScannedText] = useState<string | null>(null);
    const [inputValue, setInputValue] = useState('');
    const [lightbox, setLightbox] = useState<Lightbox | null>(null);
    const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(
        preselectedMeeting,
    );
    const [sessionPresentCount, setSessionPresentCount] = useState(0);
    const [sessionDuplicateCount, setSessionDuplicateCount] = useState(0);
    const [scanSeq, setScanSeq] = useState(0);
    const [scanHistory, setScanHistory] = useState<ScanHistoryEntry[]>([]);

    const pushHistory = useCallback(
        (name: string, detail: string, variant: ScanHistoryVariant) => {
            setScanHistory((prev) =>
                [
                    {
                        id: `${Date.now()}-${Math.random()}`,
                        time: new Date(),
                        name,
                        detail,
                        variant,
                    },
                    ...prev,
                ].slice(0, 10),
            );
        },
        [],
    );

    // A new meeting = a new check-in session, so the tally starts fresh. Reset
    // during render (React's documented pattern for "adjusting state when a
    // prop changes") rather than in an effect, to avoid an extra render pass.
    const [countedMeetingId, setCountedMeetingId] = useState(
        selectedMeeting?.id ?? null,
    );

    if (countedMeetingId !== (selectedMeeting?.id ?? null)) {
        setCountedMeetingId(selectedMeeting?.id ?? null);
        setSessionPresentCount(0);
        setSessionDuplicateCount(0);
    }

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
        if (scanning) {
            return;
        }

        // Don't steal focus from something the user is actively using — e.g. the
        // meeting combobox's search box. Radix's Popover closes itself when focus
        // leaves it, so grabbing focus back here would silently dismiss it before
        // the user can type or pick anything. Only re-arm the hardware input when
        // nothing else (or nothing but itself) currently holds focus.
        const active = document.activeElement;

        if (
            active &&
            active !== document.body &&
            active !== hardwareInputRef.current
        ) {
            return;
        }

        hardwareInputRef.current?.focus();
    }, [scanning]);

    const resolveScan = useCallback(
        async (text: string) => {
            if (text === lastScannedText) {
                return;
            }

            setLastScannedText(text);
            setScanSeq((s) => s + 1);

            // Extract an ID from any of the supported URL patterns.
            const teamMatch = text.match(/\/teams\/(\d+)\/id-card/);
            const playerMatch = text.match(/\/players\/(\d+)\/id-card/);
            const attendeeMatch = text.match(/\/attendees\/(\d+)\/id-card/);
            // Registration cards encode a qr_token (public URLs are keyed on it so
            // registrations can't be enumerated), but cards printed before that
            // change encode the numeric id — accept either so both still scan.
            const registrationMatch = text.match(
                /\/registrations\/([\w-]+)\/id-card/,
            );

            if (
                !teamMatch &&
                !playerMatch &&
                !attendeeMatch &&
                !registrationMatch
            ) {
                const message =
                    'Invalid QR code. Please scan a Sporta ID team, player, attendee, or registration QR code.';
                setError(message);
                playErrorTone();
                pushHistory('Unknown code', message, 'danger');

                return;
            }

            const kind: 'team' | 'player' | 'attendee' | 'registration' =
                teamMatch
                    ? 'team'
                    : playerMatch
                      ? 'player'
                      : attendeeMatch
                        ? 'attendee'
                        : 'registration';
            const id = teamMatch
                ? teamMatch[1]
                : playerMatch
                  ? playerMatch[1]
                  : attendeeMatch
                    ? attendeeMatch[1]
                    : registrationMatch![1];

            const meetingId = selectedMeeting?.id ?? null;
            const checkingIntoMeeting =
                kind === 'registration' && meetingId !== null;

            const notFoundLabel =
                kind === 'team'
                    ? 'Team not found.'
                    : kind === 'player'
                      ? 'Player not found.'
                      : kind === 'attendee'
                        ? 'Attendee not found.'
                        : 'Registration not found.';
            const disqualifiedLabel =
                kind === 'team'
                    ? 'Team has been disqualified.'
                    : kind === 'player'
                      ? "Player's team has been disqualified."
                      : kind === 'attendee'
                        ? 'This attendee pass has been revoked.'
                        : 'This registration is not confirmed.';

            await stopScanner();
            setLoading(true);
            setError(null);
            setResult(null);

            try {
                if (checkingIntoMeeting) {
                    const { data } = await axios.post(
                        `/dashboard/meetings/${meetingId}/check-ins`,
                        {
                            registration_id: id,
                        },
                    );
                    const registration =
                        data.registration as ScannedRegistration;
                    const alreadyCheckedIn = Boolean(data.already_checked_in);

                    setResult({
                        kind: 'registration',
                        data: registration,
                        checkIn: {
                            meetingTitle:
                                selectedMeeting?.title ??
                                data.meeting?.title ??
                                'this meeting',
                            alreadyCheckedIn,
                        },
                    });

                    if (alreadyCheckedIn) {
                        setSessionDuplicateCount((c) => c + 1);
                        playNoticeTone();
                        pushHistory(
                            registration.name,
                            `Already checked in — ${selectedMeeting?.title ?? ''}`,
                            'warning',
                        );
                    } else {
                        setSessionPresentCount((c) => c + 1);
                        playSuccessTone();
                        pushHistory(
                            registration.name,
                            `Checked in — ${selectedMeeting?.title ?? ''}`,
                            'success',
                        );
                    }

                    return;
                }

                const endpoint =
                    kind === 'team'
                        ? `/dashboard/teams/${id}/qr-data`
                        : kind === 'player'
                          ? `/dashboard/players/${id}/qr-data`
                          : kind === 'attendee'
                            ? `/dashboard/attendees/${id}/qr-data`
                            : `/dashboard/registrations/${id}/qr-data`;

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
                playSuccessTone();

                if (kind === 'team') {
                    const team = data as ScannedTeam;
                    setResult({ kind: 'team', data: team });
                    pushHistory(
                        team.name,
                        STATUS_CONFIG[team.status].label,
                        STATUS_CONFIG[team.status].variant,
                    );
                } else if (kind === 'player') {
                    const player = data as ScannedPlayer;
                    setResult({ kind: 'player', data: player });
                    const teamStatus = player.teams?.[0]?.status;
                    pushHistory(
                        player.name,
                        teamStatus
                            ? STATUS_CONFIG[teamStatus].label
                            : 'Verified',
                        teamStatus
                            ? STATUS_CONFIG[teamStatus].variant
                            : 'success',
                    );
                } else if (kind === 'attendee') {
                    const attendee = data as ScannedAttendee;
                    setResult({ kind: 'attendee', data: attendee });
                    pushHistory(
                        attendee.name,
                        ATTENDEE_STATUS_CONFIG[attendee.status].label,
                        ATTENDEE_STATUS_CONFIG[attendee.status].variant,
                    );
                } else {
                    const registration = data as ScannedRegistration;
                    setResult({
                        kind: 'registration',
                        data: registration,
                        checkIn: null,
                    });
                    pushHistory(registration.name, 'Confirmed', 'success');
                }
            } catch (err) {
                let message: string;

                if (axios.isAxiosError(err)) {
                    const status = err.response?.status;
                    const fallback =
                        status === 403
                            ? disqualifiedLabel
                            : status === 404
                              ? notFoundLabel
                              : 'Failed to check in.';
                    message = err.response?.data?.message ?? fallback;
                } else {
                    message =
                        err instanceof Error
                            ? err.message
                            : 'Something went wrong.';
                }

                setError(message);
                playErrorTone();
                pushHistory('Scan failed', message, 'danger');
            } finally {
                setLoading(false);
            }
        },
        [lastScannedText, stopScanner, selectedMeeting, pushHistory],
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

            setHasUsedCamera(true);
        } catch (err) {
            setScanning(false);
            setCameraError(
                err instanceof Error
                    ? err.message
                    : 'Cannot access camera. Please allow camera permission.',
            );
        }
    }, [resolveScan]);

    // Clears the current result so the next scan can come in. Only re-arms the
    // camera if this session has actually used it — otherwise a hardware-scanner
    // desk would get an unwanted camera-permission prompt on every "Scan another".
    const resetForNextScan = useCallback(() => {
        setError(null);
        setCameraError(null);
        setResult(null);
        setLastScannedText(null);
    }, []);

    const handleScanAnother = useCallback(() => {
        resetForNextScan();

        if (hasUsedCamera) {
            startScanner();
        }
    }, [hasUsedCamera, resetForNextScan, startScanner]);

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
        <div className="mx-auto flex h-full w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-6 md:px-8 md:py-8">
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
                    player's, attendee's, or registration's QR code, or press{' '}
                    <span className="font-medium text-foreground">
                        Start Scanning
                    </span>{' '}
                    to use your camera.
                </p>
            </div>

            {/* Meeting check-in mode */}
            <div className="flex flex-col gap-3 rounded-xl border bg-card p-4 shadow-sm sm:flex-row sm:items-center">
                <UserCheck className="h-5 w-5 shrink-0 text-muted-foreground" />
                <div className="flex-1">
                    <p className="text-sm font-medium">Meeting Check-in Mode</p>
                    <p className="text-xs text-muted-foreground">
                        {selectedMeeting
                            ? "On — scanning a registrant's QR code will mark them present at this meeting."
                            : 'Off — registration QR codes will just show a lookup.'}
                    </p>
                    {selectedMeeting && (
                        <p className="mt-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                            {sessionPresentCount} checked in
                            {sessionDuplicateCount > 0
                                ? ` · ${sessionDuplicateCount} already checked in`
                                : ''}{' '}
                            this session
                        </p>
                    )}
                </div>
                <MeetingCombobox
                    meetings={meetings}
                    value={selectedMeeting}
                    onChange={setSelectedMeeting}
                />
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

                    {!scanning && !loading && !result && !error && (
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
                        <div
                            key={scanSeq}
                            className="flex animate-in items-center gap-4 rounded-xl border border-destructive/30 bg-destructive/10 p-6 text-destructive duration-300 zoom-in-95"
                        >
                            <AlertCircle className="h-14 w-14 shrink-0" />
                            <div className="flex-1">
                                <p className="text-2xl font-extrabold tracking-wide uppercase">
                                    Not Found
                                </p>
                                <p className="text-base">{error}</p>
                            </div>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleScanAnother}
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
                <div key={scanSeq} className="flex flex-col gap-4">
                    <ResultBanner
                        variant={STATUS_CONFIG[result.data.status].variant}
                        icon={STATUS_CONFIG[result.data.status].icon}
                        title={STATUS_CONFIG[result.data.status].label}
                        subtitle={STATUS_CONFIG[result.data.status].description}
                    />

                    {/* Team header */}
                    <div className="flex flex-col gap-4 rounded-xl border bg-card p-6 shadow-sm">
                        <ResultPersonHeader
                            photo={result.data.logo}
                            name={result.data.name}
                            onImageOpen={setLightbox}
                            badges={
                                <>
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
                                </>
                            }
                            subtitle={
                                result.data.event && (
                                    <p className="text-base text-muted-foreground">
                                        {result.data.event.name}
                                    </p>
                                )
                            }
                        />

                        <div className="flex items-center gap-2.5 rounded-lg bg-emerald-50 p-4 dark:bg-emerald-950/30">
                            <Shield className="h-5 w-5 shrink-0 text-emerald-600" />
                            <span className="text-base text-emerald-700 dark:text-emerald-400">
                                {result.data.players.length} registered player
                                {result.data.players.length !== 1 ? 's' : ''}
                            </span>
                            <Button
                                size="sm"
                                variant="outline"
                                className="ml-auto text-sm"
                                onClick={handleScanAnother}
                            >
                                Scan another
                            </Button>
                        </div>
                    </div>

                    <NextMatchCard
                        match={result.data.next_match_today}
                        teamId={result.data.id}
                    />

                    {/* Players grid */}
                    {result.data.players.length > 0 && (
                        <div className="flex flex-col gap-3">
                            <h3 className="text-xl font-semibold tracking-tight">
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
                <div key={scanSeq} className="flex flex-col gap-4">
                    {result.data.teams?.[0] && (
                        <ResultBanner
                            variant={
                                STATUS_CONFIG[result.data.teams[0].status]
                                    .variant
                            }
                            icon={
                                STATUS_CONFIG[result.data.teams[0].status].icon
                            }
                            title={
                                STATUS_CONFIG[result.data.teams[0].status].label
                            }
                            subtitle={
                                STATUS_CONFIG[result.data.teams[0].status]
                                    .description
                            }
                        />
                    )}

                    <div className="flex flex-col gap-4 rounded-xl border bg-card p-6 shadow-sm">
                        <PlayerCard
                            player={result.data}
                            onImageOpen={setLightbox}
                            size="large"
                        />

                        {result.data.teams?.[0] && (
                            <NextMatchCard
                                match={result.data.teams[0].next_match_today}
                                teamId={result.data.teams[0].id}
                            />
                        )}

                        {(() => {
                            const team = result.data.teams?.[0];

                            return (
                                <div className="flex flex-col gap-3 rounded-lg bg-slate-50 p-4 dark:bg-slate-900/40">
                                    {team && (
                                        <div className="flex flex-wrap items-center gap-3">
                                            <ZoomableImage
                                                src={team.logo}
                                                alt={team.name}
                                                onOpen={setLightbox}
                                                className="h-14 w-14 shrink-0 rounded-lg shadow-sm"
                                                fallback={
                                                    <div className="flex h-full w-full items-center justify-center rounded-lg bg-primary/10 text-lg font-extrabold text-primary shadow-sm">
                                                        {team.name
                                                            .substring(0, 2)
                                                            .toUpperCase()}
                                                    </div>
                                                }
                                            />
                                            <div className="flex min-w-0 flex-1 flex-col gap-1">
                                                <span className="truncate text-lg font-bold">
                                                    {team.name}
                                                </span>
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <Badge
                                                        variant={
                                                            STATUS_CONFIG[
                                                                team.status
                                                            ].badgeVariant
                                                        }
                                                        className={
                                                            STATUS_CONFIG[
                                                                team.status
                                                            ].badgeClassName
                                                        }
                                                    >
                                                        <CheckCircle2 className="mr-1 h-3 w-3" />
                                                        {
                                                            STATUS_CONFIG[
                                                                team.status
                                                            ].label
                                                        }
                                                    </Badge>
                                                    {team.basketball_event_category && (
                                                        <Badge variant="secondary">
                                                            {
                                                                team
                                                                    .basketball_event_category
                                                                    .name
                                                            }
                                                        </Badge>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        className={cn(
                                            'text-sm',
                                            team && 'self-end',
                                        )}
                                        onClick={handleScanAnother}
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
                <div key={scanSeq} className="flex flex-col gap-4">
                    <ResultBanner
                        variant={
                            ATTENDEE_STATUS_CONFIG[result.data.status].variant
                        }
                        icon={ATTENDEE_STATUS_CONFIG[result.data.status].icon}
                        title={ATTENDEE_STATUS_CONFIG[result.data.status].label}
                        subtitle={
                            ATTENDEE_STATUS_CONFIG[result.data.status]
                                .description
                        }
                    />

                    <div className="flex flex-col gap-4 rounded-xl border bg-card p-6 shadow-sm">
                        <ResultPersonHeader
                            photo={result.data.photo}
                            name={result.data.name}
                            onImageOpen={setLightbox}
                            badges={
                                result.data.attendee_type && (
                                    <Badge variant="secondary">
                                        {result.data.attendee_type.label}
                                    </Badge>
                                )
                            }
                            subtitle={
                                <>
                                    {result.data.organization && (
                                        <p className="text-base text-muted-foreground">
                                            {result.data.organization}
                                            {result.data.title
                                                ? ` · ${result.data.title}`
                                                : ''}
                                        </p>
                                    )}
                                    {result.data.event && (
                                        <p className="text-base text-muted-foreground">
                                            {result.data.event.name}
                                        </p>
                                    )}
                                </>
                            }
                        />

                        <ResultContactFooter
                            email={result.data.email}
                            phone={result.data.phone}
                            onScanAnother={handleScanAnother}
                        />
                    </div>
                </div>
            )}

            {/* Registration result */}
            {result?.kind === 'registration' && (
                <div key={scanSeq} className="flex flex-col gap-4">
                    <ResultBanner {...registrationBanner(result)} />

                    <div className="flex flex-col gap-4 rounded-xl border bg-card p-6 shadow-sm">
                        <ResultPersonHeader
                            photo={result.data.photo}
                            name={result.data.name}
                            onImageOpen={setLightbox}
                            badges={
                                result.data.registration_category && (
                                    <Badge variant="secondary">
                                        {result.data.registration_category.name}
                                    </Badge>
                                )
                            }
                            subtitle={
                                result.data.event && (
                                    <p className="text-base text-muted-foreground">
                                        {result.data.event.name}
                                    </p>
                                )
                            }
                        />

                        <ResultContactFooter
                            email={result.data.email}
                            phone={result.data.phone}
                            onScanAnother={handleScanAnother}
                        />
                    </div>
                </div>
            )}

            <RecentScansList entries={scanHistory} />
        </div>
    );
}

QrScanner.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: dashboard() },
        { title: 'QR Scanner', href: '/dashboard/qr-scanner' },
    ],
};
