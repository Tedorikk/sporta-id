import { Link } from '@inertiajs/react';
import { LanguageToggle } from '@/components/public/language-toggle';
import { useT } from '@/hooks/use-t';
import { SiteLogo } from './site-logo';

const NAV_LINKS = [
    { href: '/', label: 'Home' },
    { href: '/about', label: 'About' },
    { href: '/events', label: 'Events' },
    { href: '/contact', label: 'Contact' },
];

export function SiteNav() {
    const { t } = useT();

    return (
        <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
            <div className="flex items-center gap-2">
                <SiteLogo className="h-9 w-auto" />
            </div>
            <div className="hidden items-center gap-6 sm:flex">
                {NAV_LINKS.map((link) => (
                    <Link
                        key={link.href}
                        href={link.href}
                        className="text-xs font-semibold tracking-wide text-white/50 uppercase transition hover:text-white"
                    >
                        {t(link.label)}
                    </Link>
                ))}
                <LanguageToggle />
            </div>
            <LanguageToggle className="sm:hidden" />
        </nav>
    );
}
