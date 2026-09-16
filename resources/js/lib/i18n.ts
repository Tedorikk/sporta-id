import id from '@lang/id.json';

/**
 * Translations for the public, registrant-facing pages.
 *
 * Mirrors Laravel's JSON translations: the key *is* the English source string,
 * `lang/app/id.json` maps it to Indonesian, and anything missing there falls
 * back to the key. Placeholders use Laravel's `:name` syntax so a message can
 * be reused verbatim server-side with `__()`. The dashboard is not translated
 * and never calls this.
 */
export const LOCALES = ['id', 'en'] as const;

export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = 'id';

export const LOCALE_LABELS: Record<Locale, string> = {
    id: 'Bahasa Indonesia',
    en: 'English',
};

/** Intl locale tags for Date/Number formatting. */
export const INTL_LOCALES: Record<Locale, string> = {
    id: 'id-ID',
    en: 'en-GB',
};

type Dictionary = Record<string, string>;

const dictionaries: Record<Locale, Dictionary> = {
    id: id as Dictionary,
    // English is the source language, so its "dictionary" is the keys themselves.
    en: {},
};

export type Replacements = Record<string, string | number>;

/** The `t` returned by `useT()`, for helpers that build messages outside a component. */
export type Translate = (key: string, replace?: Replacements) => string;

export function isLocale(value: unknown): value is Locale {
    return (
        typeof value === 'string' &&
        (LOCALES as readonly string[]).includes(value)
    );
}

function interpolate(text: string, replace: Replacements = {}): string {
    return Object.entries(replace).reduce(
        (out, [name, value]) => out.replaceAll(`:${name}`, String(value)),
        text,
    );
}

export function translate(
    locale: Locale,
    key: string,
    replace?: Replacements,
): string {
    return interpolate(dictionaries[locale][key] ?? key, replace);
}

/**
 * Laravel's `trans_choice` for the simple `singular|plural` form. Indonesian
 * has no grammatical plural, so its entries usually carry a single form and
 * the split is a no-op.
 */
export function translateChoice(
    locale: Locale,
    key: string,
    count: number,
    replace?: Replacements,
): string {
    const forms = (dictionaries[locale][key] ?? key).split('|');
    const form = forms.length > 1 && count !== 1 ? forms[1] : forms[0];

    return interpolate(form, { count, ...replace });
}
