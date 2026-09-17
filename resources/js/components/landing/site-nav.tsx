import { Link, usePage } from '@inertiajs/react';
import { Menu, X } from 'lucide-react';
import { useState } from 'react';
import { LanguageToggle } from '@/components/public/language-toggle';
import { useT } from '@/hooks/use-t';
import { cn } from '@/lib/utils';
import { SiteLogo } from './site-logo';

const NAV_LINKS = [
    { href: '/', label: 'Home' },
    { href: '/about', label: 'About' },
    { href: '/events', label: 'Events' },
    { href: '/contact', label: 'Contact' },
];

export function SiteNav() {
    const { t } = useT();
    const { url } = usePage();
    const [open, setOpen] = useState(false);

    function isActive(href: string) {
        return href === '/' ? url === '/' : url.startsWith(href);
    }

    return (
        <nav className="sticky top-0 z-40 border-b border-ink/10 bg-paper/90 backdrop-blur-sm">
            <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
                <Link href="/" className="flex items-center gap-2">
                    <SiteLogo className="h-8 w-auto sm:h-9" />
                </Link>

                <div className="hidden items-center gap-8 sm:flex">
                    {NAV_LINKS.map((link) => (
                        <Link
                            key={link.href}
                            href={link.href}
                            className={cn(
                                'relative py-1 text-xs font-semibold tracking-widest uppercase transition-colors hover:text-poster-red',
                                isActive(link.href)
                                    ? 'text-poster-red after:absolute after:-bottom-[17px] after:left-0 after:h-0.5 after:w-full after:bg-poster-red'
                                    : 'text-ink/60',
                            )}
                        >
                            {t(link.label)}
                        </Link>
                    ))}
                    <LanguageToggle />
                </div>

                <button
                    type="button"
                    onClick={() => setOpen((v) => !v)}
                    aria-label={open ? 'Close menu' : 'Open menu'}
                    aria-expanded={open}
                    className="cursor-pointer text-ink sm:hidden"
                >
                    {open ? <X className="size-6" /> : <Menu className="size-6" />}
                </button>
            </div>

            <div
                className={cn(
                    'overflow-hidden border-t border-ink/10 bg-paper transition-[max-height] duration-200 ease-in-out sm:hidden',
                    open ? 'max-h-80' : 'max-h-0 border-t-0',
                )}
            >
                <div className="flex flex-col gap-1 px-6 py-4">
                    {NAV_LINKS.map((link) => (
                        <Link
                            key={link.href}
                            href={link.href}
                            onClick={() => setOpen(false)}
                            className={cn(
                                'rounded-md px-3 py-2.5 text-sm font-semibold tracking-wide uppercase transition-colors',
                                isActive(link.href)
                                    ? 'bg-poster-red/10 text-poster-red'
                                    : 'text-ink/70 hover:bg-ink/5',
                            )}
                        >
                            {t(link.label)}
                        </Link>
                    ))}
                    <div className="mt-2 px-3">
                        <LanguageToggle />
                    </div>
                </div>
            </div>
        </nav>
    );
}
