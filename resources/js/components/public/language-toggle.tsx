import { router } from '@inertiajs/react';
import { useLocale } from '@/hooks/use-t';
import { LOCALE_LABELS, LOCALES } from '@/lib/i18n';
import type { Locale } from '@/lib/i18n';
import { cn } from '@/lib/utils';

/**
 * ID / EN switch for the public pages. Re-requests the current page with
 * `?lang=` so the server (SetPublicLocale) sets the cookie and every later
 * visit — and the emails we send — follow the choice. State is preserved so
 * a half-filled registration form survives the switch.
 */
export function LanguageToggle({ className }: { className?: string }) {
    const current = useLocale();

    function switchTo(locale: Locale) {
        if (locale === current) {
            return;
        }

        const params = new URLSearchParams(window.location.search);
        params.set('lang', locale);

        router.get(
            `${window.location.pathname}?${params.toString()}`,
            {},
            { preserveState: true, preserveScroll: true },
        );
    }

    return (
        <div
            role="group"
            aria-label="Language"
            className={cn(
                'inline-flex overflow-hidden rounded-full border border-white/30 bg-black/20 text-[11px] font-bold tracking-wide backdrop-blur-sm',
                className,
            )}
        >
            {LOCALES.map((locale) => (
                <button
                    key={locale}
                    type="button"
                    lang={locale}
                    aria-pressed={locale === current}
                    aria-label={LOCALE_LABELS[locale]}
                    title={LOCALE_LABELS[locale]}
                    onClick={() => switchTo(locale)}
                    className={cn(
                        'cursor-pointer px-2.5 py-1 uppercase transition-colors',
                        locale === current
                            ? 'bg-white text-neutral-900'
                            : 'text-white/80 hover:bg-white/15 hover:text-white',
                    )}
                >
                    {locale}
                </button>
            ))}
        </div>
    );
}
