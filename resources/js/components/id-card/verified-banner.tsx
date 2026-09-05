import { BadgeCheck, ShieldX } from 'lucide-react';

interface VerifiedBannerProps {
    valid: boolean;
    name: string;
    subtitle?: string;
    code?: string | null;
    /** Shown instead of the code when the pass isn't valid. */
    invalidNote?: string;
}

/**
 * What someone working a door actually sees after scanning a card's QR with a
 * phone camera. It reads at arm's length and leads with the code, because the
 * check being made is "does this match the badge in my hand".
 *
 * Hidden when printing: a printed copy of this page should be the card, not
 * the proof that the card is real.
 */
export function VerifiedBanner({
    valid,
    name,
    subtitle,
    code,
    invalidNote,
}: VerifiedBannerProps) {
    const Icon = valid ? BadgeCheck : ShieldX;

    return (
        <div
            className={`w-full max-w-sm rounded-2xl p-5 text-white shadow-2xl print:hidden ${
                valid ? 'bg-emerald-500' : 'bg-red-600'
            }`}
        >
            <div className="flex items-center gap-3">
                <Icon className="h-10 w-10 shrink-0" />
                <div className="min-w-0">
                    <p className="text-2xl font-extrabold tracking-wide uppercase">
                        {valid ? 'Verified' : 'Not valid'}
                    </p>
                    <p className="truncate text-sm opacity-90">
                        {name}
                        {subtitle && ` · ${subtitle}`}
                    </p>
                </div>
            </div>

            {valid && code && (
                <div className="mt-4 rounded-xl bg-white/15 px-4 py-3">
                    <p className="text-[11px] font-semibold tracking-widest uppercase opacity-80">
                        Code on the card
                    </p>
                    <p className="font-mono text-3xl font-bold tracking-[0.2em] tabular-nums">
                        {code}
                    </p>
                </div>
            )}

            {!valid && invalidNote && (
                <p className="mt-4 rounded-xl bg-white/15 px-4 py-3 text-sm">
                    {invalidNote}
                </p>
            )}
        </div>
    );
}
