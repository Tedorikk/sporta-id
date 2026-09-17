import { Link, usePage } from '@inertiajs/react';
import { Menu } from 'lucide-react';
import { LanguageToggle } from '@/components/public/language-toggle';
import {
    Sheet,
    SheetClose,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from '@/components/ui/sheet';
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

    function isActive(href: string) {
        return href === '/' ? url === '/' : url.startsWith(href);
    }

    return (
        <nav className="border-ink/10 bg-paper/90 sticky top-0 z-40 animate-in border-b shadow-sm backdrop-blur-md duration-500 fade-in slide-in-from-top-4">
            <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
                <Link href="/" className="group flex items-center gap-2">
                    <SiteLogo className="h-8 w-auto transition-transform duration-300 ease-out group-hover:scale-105 sm:h-9" />
                </Link>

                <div className="hidden items-center gap-8 sm:flex">
                    {NAV_LINKS.map((link) => (
                        <Link
                            key={link.href}
                            href={link.href}
                            className={cn(
                                'group/link relative py-1 text-xs font-semibold tracking-widest uppercase transition-colors',
                                isActive(link.href)
                                    ? 'text-poster-red'
                                    : 'text-ink/60 hover:text-poster-red',
                            )}
                        >
                            {t(link.label)}
                            <span
                                className={cn(
                                    'bg-poster-red absolute -bottom-1 left-0 h-0.5 w-full origin-left scale-x-0 transition-transform duration-300 ease-out group-hover/link:scale-x-100',
                                    isActive(link.href) && 'scale-x-100',
                                )}
                            />
                        </Link>
                    ))}
                    <LanguageToggle />
                </div>

                <Sheet>
                    <SheetTrigger asChild>
                        <button
                            type="button"
                            aria-label="Open menu"
                            className="text-ink cursor-pointer transition-transform active:scale-90 sm:hidden"
                        >
                            <Menu className="size-6" />
                        </button>
                    </SheetTrigger>
                    <SheetContent
                        side="right"
                        className="border-ink/10 bg-paper text-ink w-72 gap-0 sm:hidden"
                    >
                        <SheetTitle className="sr-only">
                            Navigation menu
                        </SheetTitle>
                        <SheetHeader className="border-ink/10 border-b">
                            <SiteLogo className="h-8 w-auto" />
                        </SheetHeader>
                        <div className="flex flex-col gap-1 p-4">
                            {NAV_LINKS.map((link, i) => (
                                <SheetClose key={link.href} asChild>
                                    <Link
                                        href={link.href}
                                        style={{
                                            animationDelay: `${i * 60}ms`,
                                        }}
                                        className={cn(
                                            'animate-in rounded-md px-3 py-2.5 text-sm font-semibold tracking-wide uppercase transition-colors fill-mode-backwards fade-in slide-in-from-right-4',
                                            isActive(link.href)
                                                ? 'bg-poster-red/10 text-poster-red'
                                                : 'text-ink/70 hover:bg-ink/5',
                                        )}
                                    >
                                        {t(link.label)}
                                    </Link>
                                </SheetClose>
                            ))}
                            <div className="mt-3 px-3">
                                <LanguageToggle />
                            </div>
                        </div>
                    </SheetContent>
                </Sheet>
            </div>
        </nav>
    );
}
