interface SiteLogoProps {
    className?: string;
}

export function SiteLogo({ className }: SiteLogoProps) {
    return (
        <img
            src="/images/sporta-logo.png"
            alt="Sporta Indonesia"
            className={className ?? 'h-9 w-auto'}
        />
    );
}
