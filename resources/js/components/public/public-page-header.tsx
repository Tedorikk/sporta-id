import { isValidHexColor } from '@/lib/color';
import { formatImageUrl } from '@/lib/image-utils';
import { SiteLogo } from '../landing/site-logo';
import { LanguageToggle } from './language-toggle';

interface PublicPageHeaderProps {
    eyebrow: string;
    title: string;
    subtitle?: string;
    /** Event-specific branding — falls back to the default Sporta Indonesia logo/red when absent. */
    logoUrl?: string | null;
    accentColor?: string | null;
    /** Off for pages inside PublicLayout, whose nav already carries the switch. */
    languageToggle?: boolean;
}

export function PublicPageHeader({
    eyebrow,
    title,
    subtitle,
    logoUrl,
    accentColor,
    languageToggle = true,
}: PublicPageHeaderProps) {
    const accent = isValidHexColor(accentColor) ? accentColor : null;

    return (
        <div
            className="relative flex flex-col items-center gap-2 bg-poster-red px-6 pt-10 pb-8 text-center text-paper"
            style={accent ? { backgroundColor: accent } : undefined}
        >
            {languageToggle && (
                <LanguageToggle className="absolute top-4 right-4 z-10" />
            )}

            <div className="flex items-center justify-center">
                {logoUrl ? (
                    <img
                        src={formatImageUrl(logoUrl)}
                        alt=""
                        className="h-16 w-auto object-contain"
                    />
                ) : (
                    <SiteLogo className="h-16 w-auto" />
                )}
            </div>
            <span className="bg-ink px-3 py-1 text-xs font-semibold tracking-wide text-poster-yellow uppercase">
                {eyebrow}
            </span>
            <h1 className="font-display text-3xl font-bold">{title}</h1>
            {subtitle && (
                <p className="max-w-sm text-sm text-paper/80">{subtitle}</p>
            )}
        </div>
    );
}
