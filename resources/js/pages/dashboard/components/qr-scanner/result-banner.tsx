import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export type ResultBannerVariant = 'success' | 'warning' | 'danger';

const VARIANT_CLASSNAMES: Record<ResultBannerVariant, string> = {
    success: 'bg-emerald-500',
    warning: 'bg-amber-500',
    danger: 'bg-red-500',
};

interface ResultBannerProps {
    variant: ResultBannerVariant;
    icon: LucideIcon;
    title: string;
    subtitle?: string;
}

/**
 * Big, hard-to-miss pass/fail banner — sized and animated to read at a glance
 * from arm's length, since staff working a door often glance rather than read.
 * The parent should remount this (e.g. via a `key` tied to a scan sequence
 * number) so the entrance animation replays on every scan, not just the first.
 */
export function ResultBanner({ variant, icon: Icon, title, subtitle }: ResultBannerProps) {
    return (
        <div
            className={cn(
                'flex animate-in items-center gap-4 rounded-xl p-6 text-white shadow-lg duration-300 zoom-in-95',
                VARIANT_CLASSNAMES[variant],
            )}
        >
            <Icon className="h-14 w-14 shrink-0" />
            <div>
                <p className="text-2xl font-extrabold tracking-wide uppercase">{title}</p>
                {subtitle && <p className="text-base opacity-90">{subtitle}</p>}
            </div>
        </div>
    );
}
