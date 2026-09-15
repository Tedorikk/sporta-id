import { isValidHexColor, shadeColor } from '@/lib/color';
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
}

export function PublicPageHeader({
    eyebrow,
    title,
    subtitle,
    logoUrl,
    accentColor,
}: PublicPageHeaderProps) {
    const accent = isValidHexColor(accentColor) ? accentColor : null;

    return (
        <div
            className={
                accent
                    ? 'relative flex flex-col items-center gap-2 overflow-hidden px-6 py-10 text-center'
                    : 'relative flex flex-col items-center gap-2 overflow-hidden bg-gradient-to-br from-red-600 via-red-700 to-rose-950 px-6 py-10 text-center'
            }
            style={{
                clipPath: 'polygon(0 0, 100% 0, 100% 88%, 50% 100%, 0 88%)',
                ...(accent && {
                    backgroundImage: `linear-gradient(to bottom right, ${accent}, ${shadeColor(accent, -10)}, ${shadeColor(accent, -55)})`,
                }),
            }}
        >
            <div className="pointer-events-none absolute inset-0 opacity-10">
                <svg
                    className="h-full w-full"
                    xmlns="http://www.w3.org/2000/svg"
                >
                    <defs>
                        <pattern
                            id="ppgrid"
                            width="22"
                            height="22"
                            patternUnits="userSpaceOnUse"
                        >
                            <path
                                d="M 22 0 L 0 0 0 22"
                                fill="none"
                                stroke="white"
                                strokeWidth="0.5"
                            />
                        </pattern>
                    </defs>
                    <rect width="100%" height="100%" fill="url(#ppgrid)" />
                </svg>
            </div>

            <LanguageToggle className="absolute top-3 right-3 z-20" />

            <div className="relative z-10 flex flex-col items-center gap-2">
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
                <span className="text-xs font-bold tracking-[0.3em] text-white/70 uppercase">
                    {eyebrow}
                </span>
                <h1 className="text-2xl font-black tracking-tight text-white uppercase">
                    {title}
                </h1>
                {subtitle && (
                    <p className="max-w-sm text-sm text-white/80">{subtitle}</p>
                )}
            </div>
        </div>
    );
}
