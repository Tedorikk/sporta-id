import { Head, Link } from '@inertiajs/react';
import { ArrowRight, UsersRound } from 'lucide-react';
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
            <Head title={`${t('Register')} — ${event.name} — Sporta Indonesia`} />

            <div className="relative flex min-h-screen items-center justify-center bg-neutral-950 px-4 py-10">
                <div className="relative z-10 w-full max-w-lg overflow-hidden rounded-3xl border-2 border-black bg-white shadow-2xl">
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
                                    {registrationCategories.map((category) => {
                                        const details = (
                                            <div className="flex min-w-0 flex-col">
                                                <span className="truncate font-bold text-neutral-900">
                                                    {category.name}
                                                </span>
                                                <span className="text-xs text-neutral-500">
                                                    {category.subject_type ===
                                                    'team'
                                                        ? t('Per team')
                                                        : t('Per person')}
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
                                                    className="flex items-center justify-between gap-3 rounded-2xl border-2 border-neutral-200 px-4 py-3 opacity-60"
                                                >
                                                    {details}
                                                    <span className="shrink-0 rounded-full border-2 border-neutral-300 px-3 py-1.5 text-[11px] font-bold tracking-wide text-neutral-500 uppercase">
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
                                                className="group flex items-center justify-between gap-3 rounded-2xl border-2 border-black px-4 py-3 transition hover:bg-neutral-50"
                                            >
                                                {details}
                                                <span className="flex shrink-0 items-center gap-2">
                                                    {formatPublicPrice(
                                                        category.price,
                                                    ) && (
                                                        <span className="text-sm font-black text-neutral-900">
                                                            {formatPublicPrice(
                                                                category.price,
                                                            )}
                                                        </span>
                                                    )}
                                                    <span className="flex items-center gap-1 rounded-full bg-red-600 px-3 py-1.5 text-[11px] font-bold tracking-wide text-white uppercase transition group-hover:bg-red-700">
                                                        {t('Register')}
                                                        <ArrowRight className="h-3 w-3" />
                                                    </span>
                                                </span>
                                            </Link>
                                        );
                                    })}
                                </div>

                                {hasIndividualOpen && (
                                    <Link
                                        href={`/events/${event.id}/group-registration`}
                                        className="flex items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-neutral-300 p-3 text-sm font-semibold text-neutral-600 transition hover:border-neutral-400 hover:text-neutral-900"
                                    >
                                        <UsersRound className="h-4 w-4" />
                                        {t(
                                            'Registering several people? Sign everyone up in one payment.',
                                        )}
                                    </Link>
                                )}

                                <p className="text-center text-xs text-neutral-400">
                                    {t(
                                        'Paid registrations are settled online through Midtrans right after you submit the form. See our',
                                    )}{' '}
                                    <Link
                                        href="/terms"
                                        className="text-red-600 underline-offset-2 hover:underline"
                                    >
                                        {t('Terms & Conditions')}
                                    </Link>{' '}
                                    {t('and')}{' '}
                                    <Link
                                        href="/refund-policy"
                                        className="text-red-600 underline-offset-2 hover:underline"
                                    >
                                        {t('Refund Policy')}
                                    </Link>
                                    .
                                </p>
                            </>
                        ) : (
                            <p className="py-6 text-center text-sm text-neutral-500">
                                {t(
                                    'This event has no registration categories yet.',
                                )}
                            </p>
                        )}

                        <Link
                            href={`/events/${event.slug}`}
                            className="text-center text-xs font-medium text-neutral-400 underline-offset-2 hover:text-neutral-600 hover:underline"
                        >
                            {t('View full event page')}
                        </Link>
                    </div>
                </div>
            </div>
        </>
    );
}
