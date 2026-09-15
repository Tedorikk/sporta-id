import { usePage } from '@inertiajs/react';
import { useCallback } from 'react';
import {
    DEFAULT_LOCALE,
    isLocale,
    translate,
    translateChoice,
} from '@/lib/i18n';
import type { Locale, Replacements } from '@/lib/i18n';

/** The locale the server resolved for this request (see SetPublicLocale). */
export function useLocale(): Locale {
    const { locale } = usePage().props;

    return isLocale(locale) ? locale : DEFAULT_LOCALE;
}

/**
 * `t('Step :current of :total', { current: 1, total: 3 })`. Returns the
 * English key untouched when there is no translation, so a new string can
 * ship and be translated in lang/app/id.json afterwards.
 */
export function useT() {
    const locale = useLocale();

    const t = useCallback(
        (key: string, replace?: Replacements) =>
            translate(locale, key, replace),
        [locale],
    );

    const tc = useCallback(
        (key: string, count: number, replace?: Replacements) =>
            translateChoice(locale, key, count, replace),
        [locale],
    );

    return { t, tc, locale };
}
