import { Link } from '@inertiajs/react';
import { useCurrentUrl } from '@/hooks/use-current-url';
import { mainNavItems } from '@/lib/nav-items';
import { cn } from '@/lib/utils';

/**
 * Primary navigation for phones, sitting where the thumb already is.
 *
 * The sidebar drawer stays for everything secondary — organization switcher,
 * user menu, external links — which is the "combo" arrangement Nielsen Norman
 * measured as the strongest of the three they tested: with four or fewer
 * top-level destinations, showing them beats hiding them behind a menu that
 * costs roughly two seconds to open and is reached far less often.
 *
 * Hidden from md up with CSS rather than a JS breakpoint check, so the server
 * render and the first client paint agree and nothing flashes.
 */
export function MobileTabBar() {
    const { isCurrentUrl, isCurrentOrParentUrl } = useCurrentUrl();

    return (
        <nav
            aria-label="Primary"
            className={cn(
                'fixed inset-x-0 bottom-0 z-40 border-t border-sidebar-border/70 bg-background md:hidden',
                // Keeps the row clear of the iOS home indicator.
                'pb-[env(safe-area-inset-bottom)]',
            )}
        >
            <ul className="flex items-stretch">
                {mainNavItems.map((item) => {
                    // Dashboard is every other page's prefix, so it only counts
                    // as current on an exact match; the rest own their subtrees.
                    const isActive =
                        item.title === 'Dashboard'
                            ? isCurrentUrl(item.href)
                            : isCurrentOrParentUrl(item.href);

                    return (
                        <li key={item.title} className="min-w-0 flex-1">
                            <Link
                                href={item.href}
                                prefetch
                                aria-current={isActive ? 'page' : undefined}
                                className={cn(
                                    'flex h-14 flex-col items-center justify-center gap-1 px-1 transition-colors',
                                    'active:bg-muted',
                                    isActive
                                        ? 'text-primary'
                                        : 'text-muted-foreground',
                                )}
                            >
                                {item.icon && (
                                    <item.icon
                                        className="size-5 shrink-0"
                                        aria-hidden
                                    />
                                )}
                                <span className="w-full truncate text-center text-[11px] leading-none font-medium">
                                    {item.shortTitle ?? item.title}
                                </span>
                            </Link>
                        </li>
                    );
                })}
            </ul>
        </nav>
    );
}
