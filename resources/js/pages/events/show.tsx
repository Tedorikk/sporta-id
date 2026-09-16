import { Head, Link } from '@inertiajs/react';
import {
    ArrowRight,
    Calendar,
    Facebook,
    Instagram,
    LayoutGrid,
    Mic,
    MessageCircle,
    Phone,
    Swords,
    Ticket,
    Trophy,
    Users,
    Youtube,
} from 'lucide-react';
import { BasketballCategorySection } from '@/components/public/basketball-category-section';
import { MatchesCalendar } from '@/components/public/matches-calendar';
import { RaceResultsSection } from '@/components/public/race-results-section';
import type { PublicRaceResult } from '@/components/public/race-results-section';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useT } from '@/hooks/use-t';
import PublicLayout from '@/layouts/public-layout';
import { formatPublicPrice } from '@/lib/format-currency';
import { formatDate, formatDateTime } from '@/lib/format-date';
import { formatImageUrl } from '@/lib/image-utils';
import type { Event } from '@/types/event';
import { EVENT_STATUS_LABEL } from '@/types/event';
import type { Meeting } from '@/types/meeting';
import type { PublicEventCategory } from '@/types/public-event-category';
import type { PublicRegistrationCategory } from '@/types/registration-category';

interface Props {
    event: Event;
    categories: PublicEventCategory[] | null;
    /** Null until the organizer publishes the race's results. */
    raceResults: PublicRaceResult[] | null;
    meetings: Meeting[];
    registrationCategories: PublicRegistrationCategory[];
}

const UNAVAILABLE_LABEL: Record<string, string> = {
    closed: 'Registration closed',
    full: 'Sold out',
    ended: 'Event has ended',
};

const STATUS_STYLE: Record<string, string> = {
    upcoming: 'bg-amber-400 text-amber-950',
    ongoing: 'bg-emerald-500 text-white',
    past: 'bg-neutral-400 text-neutral-950',
};

const SOCIAL_LINKS: {
    key: keyof Event;
    label: string;
    icon: typeof Instagram;
}[] = [
    { key: 'instagram_url', label: 'Instagram', icon: Instagram },
    { key: 'facebook_url', label: 'Facebook', icon: Facebook },
    { key: 'youtube_url', label: 'YouTube', icon: Youtube },
    { key: 'whatsapp_url', label: 'WhatsApp', icon: MessageCircle },
];

export default function EventShow({
    event,
    categories,
    raceResults,
    meetings,
    registrationCategories,
}: Props) {
    const { t, tc } = useT();
    const hasCategories = Boolean(categories && categories.length > 0);
    const hasRaceResults = Boolean(raceResults && raceResults.length > 0);
    const hasMeetings = meetings.length > 0;
    const hasRegistration = registrationCategories.length > 0;
    const totalTeams =
        categories?.reduce((sum, c) => sum + c.teams.length, 0) ?? 0;
    const totalMatches =
        categories?.reduce((sum, c) => sum + c.matches.length, 0) ?? 0;
    const totalPools =
        categories?.reduce((sum, c) => sum + c.pools.length, 0) ?? 0;
    const calendarMatches =
        categories?.flatMap((c) =>
            c.matches.map((match) => ({ match, categoryName: c.name })),
        ) ?? [];

    const stats = [
        {
            label: t('Categories'),
            value: categories?.length ?? 0,
            icon: Trophy,
        },
        { label: t('Teams'), value: totalTeams, icon: Users },
        { label: t('Pools'), value: totalPools, icon: LayoutGrid },
        { label: t('Matches'), value: totalMatches, icon: Swords },
    ].filter((stat) => stat.value > 0);

    const activeSocialLinks = SOCIAL_LINKS.filter((social) =>
        Boolean(event[social.key]),
    );

    return (
        <>
            <Head title={`${event.name} — Sporta Indonesia`} />

            <PublicLayout>
                <section className="relative overflow-hidden bg-gradient-to-br from-red-700 via-red-800 to-neutral-950">
                    {event.banner && (
                        <img
                            src={formatImageUrl(event.banner)}
                            alt={event.name}
                            className="absolute inset-0 h-full w-full object-cover opacity-30"
                        />
                    )}
                    <div className="relative mx-auto flex max-w-5xl flex-col gap-4 px-6 py-16 sm:py-20">
                        <div className="flex flex-wrap items-center gap-2">
                            <span
                                className={`w-fit rounded-full px-3 py-1 text-xs font-bold tracking-wide uppercase ${STATUS_STYLE[event.status] ?? 'bg-white text-black'}`}
                            >
                                {t(
                                    EVENT_STATUS_LABEL[event.status] ??
                                        event.status,
                                )}
                            </span>
                            {event.category && (
                                <span className="w-fit rounded-full border-2 border-white/25 px-3 py-1 text-xs font-bold tracking-wide text-white/80 uppercase">
                                    {event.category}
                                </span>
                            )}
                        </div>

                        <h1 className="text-4xl leading-[1.05] font-black tracking-tight uppercase sm:text-5xl">
                            {event.name}
                        </h1>

                        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-white/80">
                            <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4" />
                                {formatDate(event.start_date)} –{' '}
                                {formatDate(event.end_date)}
                            </div>
                            {event.contact_person && (
                                <a
                                    href={`tel:${event.contact_person}`}
                                    className="flex items-center gap-2 transition hover:text-white"
                                >
                                    <Phone className="h-4 w-4" />
                                    {event.contact_person}
                                </a>
                            )}
                        </div>

                        {event.description && (
                            <p className="max-w-2xl text-sm text-white/70 sm:text-base">
                                {event.description}
                            </p>
                        )}

                        {activeSocialLinks.length > 0 && (
                            <div className="flex gap-2 pt-1">
                                {activeSocialLinks.map((social) => {
                                    const Icon = social.icon;

                                    return (
                                        <a
                                            key={social.key}
                                            href={event[social.key] as string}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            aria-label={social.label}
                                            className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-white/25 text-white/80 transition hover:border-white hover:text-white"
                                        >
                                            <Icon className="h-4 w-4" />
                                        </a>
                                    );
                                })}
                            </div>
                        )}

                        {stats.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-3">
                                {stats.map((stat) => {
                                    const Icon = stat.icon;

                                    return (
                                        <div
                                            key={stat.label}
                                            className="flex items-center gap-2 rounded-xl border-2 border-white/15 bg-white/5 px-3 py-2"
                                        >
                                            <Icon className="h-4 w-4 text-white/50" />
                                            <span className="text-sm font-bold tabular-nums">
                                                {stat.value}
                                            </span>
                                            <span className="text-xs text-white/50 uppercase">
                                                {stat.label}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </section>

                <section className="mx-auto flex max-w-5xl flex-col gap-10 px-6 py-14">
                    {hasRegistration && (
                        <div className="flex flex-col gap-6">
                            <h2 className="flex items-center gap-2 text-2xl font-black tracking-tight uppercase">
                                <Ticket className="h-5 w-5 text-white/50" />
                                {t('Register')}
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
                    )}

                    {calendarMatches.length > 0 && (
                        <div className="flex flex-col gap-6">
                            <h2 className="text-2xl font-black tracking-tight uppercase">
                                {t('Match Schedule')}
                            </h2>
                            <MatchesCalendar matches={calendarMatches} />
                        </div>
                    )}

                    {hasMeetings && (
                        <div className="flex flex-col gap-6">
                            <h2 className="flex items-center gap-2 text-2xl font-black tracking-tight uppercase">
                                <Mic className="h-5 w-5 text-white/50" />
                                {t('Schedule')}
                            </h2>
                            <div className="flex flex-col gap-3">
                                {meetings.map((meeting) => (
                                    <div
                                        key={meeting.id}
                                        className="flex flex-col gap-3 rounded-2xl border-2 border-white/10 bg-white/5 p-5 sm:flex-row sm:items-center sm:justify-between"
                                    >
                                        <div className="flex flex-col gap-1">
                                            <span className="text-lg font-bold text-white">
                                                {meeting.title}
                                            </span>
                                            <span className="text-sm text-white/50">
                                                {formatDateTime(
                                                    meeting.scheduled_at,
                                                )}
                                                {meeting.ends_at
                                                    ? ` – ${formatDateTime(meeting.ends_at)}`
                                                    : ''}
                                                {meeting.location
                                                    ? ` · ${meeting.location}`
                                                    : ''}
                                            </span>
                                            {meeting.description && (
                                                <p className="max-w-xl text-sm text-white/60">
                                                    {meeting.description}
                                                </p>
                                            )}
                                        </div>
                                        {meeting.speaker && (
                                            <div className="flex items-center gap-3">
                                                <Avatar>
                                                    <AvatarImage
                                                        src={
                                                            meeting.speaker
                                                                .photo
                                                                ? formatImageUrl(
                                                                      meeting
                                                                          .speaker
                                                                          .photo,
                                                                  )
                                                                : undefined
                                                        }
                                                        alt={
                                                            meeting.speaker.name
                                                        }
                                                    />
                                                    <AvatarFallback>
                                                        {meeting.speaker.name
                                                            .slice(0, 2)
                                                            .toUpperCase()}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-semibold text-white">
                                                        {meeting.speaker.name}
                                                    </span>
                                                    {meeting.speaker.title && (
                                                        <span className="text-xs text-white/50">
                                                            {
                                                                meeting.speaker
                                                                    .title
                                                            }
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {hasRaceResults && (
                        <div className="flex flex-col gap-6">
                            <h2 className="text-2xl font-black tracking-tight uppercase">
                                Results
                            </h2>
                            {raceResults?.map((result) => (
                                <RaceResultsSection
                                    key={result.id}
                                    result={result}
                                />
                            ))}
                        </div>
                    )}

                    {hasCategories ? (
                        <div className="flex flex-col gap-6">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                                <h2 className="text-2xl font-black tracking-tight uppercase">
                                    {t('Categories & Matches')}
                                </h2>
                                {categories && categories.length > 1 && (
                                    <div className="flex flex-wrap gap-2">
                                        {categories.map((category) => (
                                            <a
                                                key={category.id}
                                                href={`#category-${category.id}`}
                                                className="rounded-full border-2 border-white/15 px-3 py-1 text-xs font-bold tracking-wide text-white/60 uppercase transition hover:border-red-500 hover:text-white"
                                            >
                                                {category.name}
                                            </a>
                                        ))}
                                    </div>
                                )}
                            </div>
                            {categories?.map((category) => (
                                <div
                                    key={category.id}
                                    id={`category-${category.id}`}
                                    className="scroll-mt-24"
                                >
                                    <BasketballCategorySection
                                        category={category}
                                    />
                                </div>
                            ))}
                        </div>
                    ) : (
                        !hasMeetings &&
                        !hasRegistration &&
                        !hasRaceResults && (
                            <p className="text-center text-sm text-white/40">
                                {t(
                                    'Details for this event will be posted soon.',
                                )}{' '}
                                <Link
                                    href="/events"
                                    className="text-red-400 hover:underline"
                                >
                                    {t('Browse other events')}
                                </Link>
                                .
                            </p>
                        )
                    )}
                </section>
            </PublicLayout>
        </>
    );
}
