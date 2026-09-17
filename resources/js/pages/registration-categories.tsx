import { Head, Link } from '@inertiajs/react';
import { UsersRound } from 'lucide-react';
import { SiteFooter } from '@/components/landing/site-footer';
import { PublicPageHeader } from '@/components/public/public-page-header';
import { useForceLightMode } from '@/hooks/use-force-light-mode';
import { useT } from '@/hooks/use-t';
import { formatPublicPrice } from '@/lib/format-currency';
import type { Event } from '@/types/event';
import type { PublicRegistrationCategory } from '@/types/registration-category';

interface Props {
    event: Event;
    registrationCategories: PublicRegistrationCategory[];
}

const UNAVAILABLE_LABEL: Record<string, string> = {
    closed: 'Registration closed',
    full: 'Sold out',
    ended: 'Event has ended',
};

export default function RegistrationCategoriesPage({
    event,
    registrationCategories,
}: Props) {
    useForceLightMode();
    const { t, tc } = useT();
    const hasIndividualOpen = registrationCategories.some(
        (c) => c.subject_type === 'individual' && c.is_available,
    );

    return (
        <>
            <Head
                title={`${t('Register')} — ${event.name} — Sporta Indonesia`}
            />

            <div className="flex min-h-screen flex-col bg-paper">
                <div className="relative flex flex-1 items-center justify-center px-4 py-10">
                    <div className="relative z-10 w-full max-w-lg border border-ink/12 bg-paper">
                        <PublicPageHeader
                            eyebrow={t('Registration')}
                            title={event.name}
                            subtitle={t('Choose a category to register')}
                            logoUrl={event.logo}
                            accentColor={event.accent_color}
                        />

                        <div className="flex flex-col gap-4 px-6 py-6">
                            {registrationCategories.length > 0 ? (
                                <>
                                    <div className="flex flex-col gap-2.5">
                                        {registrationCategories.map(
                                            (category) => {
                                                const details = (
                                                    <div className="flex min-w-0 flex-col">
                                                        <span className="truncate font-semibold text-ink">
                                                            {category.name}
                                                        </span>
                                                        <span className="text-xs text-ink/50">
                                                            {category.subject_type ===
                                                            'team'
                                                                ? t('Per team')
                                                                : t(
                                                                      'Per person',
                                                                  )}
                                                            {category.slots_left !==
                                                                null &&
                                                            category.is_available
                                                                ? ` · ${tc(':count slot left|:count slots left', category.slots_left)}`
                                                                : ''}
                                                        </span>
                                                    </div>
                                                );

                                                if (!category.is_available) {
                                                    return (
                                                        <div
                                                            key={category.id}
                                                            className="flex items-center justify-between gap-3 border-2 border-ink/15 px-4 py-3 opacity-60"
                                                        >
                                                            {details}
                                                            <span className="shrink-0 border-2 border-ink/20 px-3 py-1.5 text-[11px] font-semibold tracking-wide text-ink/60 uppercase">
                                                                {t(
                                                                    UNAVAILABLE_LABEL[
                                                                        category.unavailable_reason ??
                                                                            ''
                                                                    ] ??
                                                                        'Unavailable',
                                                                )}
                                                            </span>
                                                        </div>
                                                    );
                                                }

                                                return (
                                                    <Link
                                                        key={category.id}
                                                        href={`/events/${event.id}/registration-categories/${category.id}/register`}
                                                        className="group flex items-center justify-between gap-3 border-2 border-ink px-4 py-3 transition hover:bg-poster-red/5"
                                                    >
                                                        {details}
                                                        <span className="flex shrink-0 items-center gap-2">
                                                            {formatPublicPrice(
                                                                category.price,
                                                            ) && (
                                                                <span className="text-sm font-bold text-ink">
                                                                    {formatPublicPrice(
                                                                        category.price,
                                                                    )}
                                                                </span>
                                                            )}
                                                            <span className="bg-poster-red px-3 py-1.5 text-[11px] font-semibold tracking-wide text-paper uppercase transition group-hover:bg-ink">
                                                                {t('Register')}
                                                            </span>
                                                        </span>
                                                    </Link>
                                                );
                                            },
                                        )}
                                    </div>

                                    {hasIndividualOpen && (
                                        <Link
                                            href={`/events/${event.id}/group-registration`}
                                            className="flex items-center justify-center gap-2 border-2 border-dashed border-ink/25 p-3 text-sm font-semibold text-ink/70 transition hover:border-ink/50 hover:text-ink"
                                        >
                                            <UsersRound className="h-4 w-4" />
                                            {t(
                                                'Registering several people? Sign everyone up in one payment.',
                                            )}
                                        </Link>
                                    )}

                                    <p className="text-center text-xs text-ink/40">
                                        {t(
                                            'Paid registrations are settled online through Midtrans right after you submit the form. See our',
                                        )}{' '}
                                        <Link
                                            href="/terms"
                                            className="text-poster-red underline-offset-2 hover:underline"
                                        >
                                            {t('Terms & Conditions')}
                                        </Link>{' '}
                                        {t('and')}{' '}
                                        <Link
                                            href="/refund-policy"
                                            className="text-poster-red underline-offset-2 hover:underline"
                                        >
                                            {t('Refund Policy')}
                                        </Link>
                                        .
                                    </p>
                                </>
                            ) : (
                                <p className="py-6 text-center text-sm text-ink/50">
                                    {t(
                                        'This event has no registration categories yet.',
                                    )}
                                </p>
                            )}

                            <Link
                                href={`/events/${event.slug}`}
                                className="text-center text-xs font-medium text-ink/40 underline-offset-2 hover:text-ink/70 hover:underline"
                            >
                                {t('View full event page')}
                            </Link>
                        </div>
                    </div>
                </div>

                <SiteFooter />
            </div>
        </>
    );
}
