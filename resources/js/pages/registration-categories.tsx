import { Head, Link } from '@inertiajs/react';
import { ArrowRight, Ticket, UsersRound } from 'lucide-react';
import PublicLayout from '@/layouts/public-layout';
import { useT } from '@/hooks/use-t';
import { formatPublicPrice } from '@/lib/format-currency';
import { formatImageUrl } from '@/lib/image-utils';
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
    const { t, tc } = useT();
    const hasIndividualOpen = registrationCategories.some(
        (c) => c.subject_type === 'individual' && c.is_available,
    );

    return (
        <>
            <Head title={`Register — ${event.name} — Sporta Indonesia`} />

            <PublicLayout>
                <section className="relative overflow-hidden bg-gradient-to-br from-red-700 via-red-800 to-neutral-950">
                    {event.banner && (
                        <img
                            src={formatImageUrl(event.banner)}
                            alt={event.name}
                            className="absolute inset-0 h-full w-full object-cover opacity-30"
                        />
                    )}
                    <div className="relative mx-auto flex max-w-5xl flex-col gap-3 px-6 py-14 sm:py-16">
                        <span className="w-fit rounded-full bg-white/10 px-3 py-1 text-xs font-bold tracking-wide text-white/70 uppercase">
                            {t('Registration')}
                        </span>
                        <h1 className="text-4xl leading-[1.05] font-black tracking-tight uppercase sm:text-5xl">
                            {event.name}
                        </h1>
                        <Link
                            href={`/events/${event.id}`}
                            className="w-fit text-sm text-white/60 underline-offset-2 hover:text-white hover:underline"
                        >
                            {t('View full event page')}
                        </Link>
                    </div>
                </section>

                <section className="mx-auto flex max-w-5xl flex-col gap-6 px-6 py-14">
                    {registrationCategories.length > 0 ? (
                        <div className="flex flex-col gap-6">
                            <h2 className="flex items-center gap-2 text-2xl font-black tracking-tight uppercase">
                                <Ticket className="h-5 w-5 text-white/50" />
                                {t('Registration Categories')}
                            </h2>
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                {registrationCategories.map((category) => {
                                    const details = (
                                        <div className="flex flex-col gap-1">
                                            <span className="text-lg font-bold text-white">
                                                {category.name}
                                            </span>
                                            {formatPublicPrice(
                                                category.price,
                                            ) && (
                                                <span className="text-xl font-black text-white">
                                                    {formatPublicPrice(
                                                        category.price,
                                                    )}
                                                </span>
                                            )}
                                            <span className="text-xs text-white/50">
                                                {category.subject_type ===
                                                'team'
                                                    ? t('Per team')
                                                    : t('Per person')}
                                                {category.slots_left !== null &&
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
                                                className="flex items-center justify-between gap-4 rounded-2xl border-2 border-white/10 bg-white/5 p-5 opacity-60"
                                            >
                                                {details}
                                                <span className="rounded-full border-2 border-white/20 px-4 py-2 text-xs font-bold tracking-wide text-white/60 uppercase">
                                                    {t(
                                                        UNAVAILABLE_LABEL[
                                                            category.unavailable_reason ??
                                                                ''
                                                        ] ?? 'Unavailable',
                                                    )}
                                                </span>
                                            </div>
                                        );
                                    }

                                    return (
                                        <Link
                                            key={category.id}
                                            href={`/events/${event.id}/registration-categories/${category.id}/register`}
                                            className="group flex items-center justify-between gap-4 rounded-2xl border-2 border-white/10 bg-white/5 p-5 transition hover:border-red-500 hover:bg-white/10"
                                        >
                                            {details}
                                            <span className="flex items-center gap-1.5 rounded-full bg-red-600 px-4 py-2 text-xs font-bold tracking-wide text-white uppercase transition group-hover:bg-red-700">
                                                {t('Register')}
                                                <ArrowRight className="h-3.5 w-3.5" />
                                            </span>
                                        </Link>
                                    );
                                })}
                            </div>

                            {hasIndividualOpen && (
                                <Link
                                    href={`/events/${event.id}/group-registration`}
                                    className="flex items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-white/20 p-4 text-sm font-semibold text-white/70 transition hover:border-white/40 hover:text-white"
                                >
                                    <UsersRound className="h-4 w-4" />
                                    {t(
                                        'Registering several people? Sign everyone up in one payment.',
                                    )}
                                </Link>
                            )}

                            <p className="text-xs text-white/50">
                                {t(
                                    'Prices are per registration and include the event entry described above. Paid registrations are settled online through Midtrans (bank transfer / virtual account, e-wallet, QRIS, or card) right after you submit the form. See our',
                                )}{' '}
                                <Link
                                    href="/terms"
                                    className="text-red-400 underline-offset-2 hover:underline"
                                >
                                    {t('Terms & Conditions')}
                                </Link>{' '}
                                {t('and')}{' '}
                                <Link
                                    href="/refund-policy"
                                    className="text-red-400 underline-offset-2 hover:underline"
                                >
                                    {t('Refund Policy')}
                                </Link>
                                .
                            </p>
                        </div>
                    ) : (
                        <p className="text-center text-sm text-white/40">
                            {t('This event has no registration categories yet.')}{' '}
                            <Link
                                href="/events"
                                className="text-red-400 hover:underline"
                            >
                                {t('Browse other events')}
                            </Link>
                            .
                        </p>
                    )}
                </section>
            </PublicLayout>
        </>
    );
}
