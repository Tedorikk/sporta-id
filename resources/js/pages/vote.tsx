import { Head, router, useForm } from '@inertiajs/react';
import { Check, Lock, Minus, Plus, Trophy } from 'lucide-react';
import { useState } from 'react';
import type { CSSProperties } from 'react';
import { PublicPageHeader } from '@/components/public/public-page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useT } from '@/hooks/use-t';
import { formatRupiah } from '@/lib/format-currency';
import { formatImageUrl } from '@/lib/image-utils';
import type {
    BallotVoter,
    PublicAward,
    PublicBallotNominee,
} from '@/types/award';

interface Props {
    event: {
        id: number;
        name: string;
        slug: string;
        logo: string | null;
        banner: string | null;
        accent_color: string | null;
    };
    award: PublicAward;
    nominees: PublicBallotNominee[];
    /** Set when the page was opened with a valid ?token= from an ID card. */
    voter: BallotVoter | null;
}

export default function Vote({ event, award, nominees, voter }: Props) {
    const [selected, setSelected] = useState<number | null>(null);

    const { data, setData, post, processing, errors } = useForm({
        award_nominee_id: 0,
        quantity: 1,
        voter_token: voter?.token ?? '',
        voter_name: voter?.name ?? '',
        voter_email: '',
        voter_phone: '',
        // Honeypot: real visitors never see this, so anything in it is a bot.
        website: '',
    });

    const { t, tc } = useT();
    const accentStyle = {
        '--accent-color': event.accent_color ?? '#dc2626',
    } as CSSProperties;

    const totalVotes = nominees.reduce(
        (sum, nominee) => sum + (nominee.votes_total ?? 0),
        0,
    );
    const maxPerCheckout = award.max_votes_per_transaction ?? 100;

    const choose = (nomineeId: number) => {
        setSelected(nomineeId);
        setData('award_nominee_id', nomineeId);
    };

    // Updates from the previous value rather than the render's closure, so a
    // supporter tapping "+" quickly does not silently lose increments.
    const adjustQuantity = (delta: number) => {
        setData((previous) => ({
            ...previous,
            quantity: Math.min(
                maxPerCheckout,
                Math.max(1, previous.quantity + delta),
            ),
        }));
    };

    const submit = () => {
        post(`/events/${event.id}/awards/${award.id}/vote`, {
            preserveScroll: true,
            onSuccess: () => setSelected(null),
        });
    };

    const cost = award.is_paid
        ? (award.price_per_vote ?? 0) * data.quantity
        : 0;

    return (
        <>
            <Head title={`${award.title} — ${event.name}`} />

            <div
                className="flex min-h-screen flex-col items-center bg-paper px-4 py-10"
                style={accentStyle}
            >
                <div className="w-full max-w-md overflow-hidden rounded-3xl border-2 border-black bg-ink shadow-2xl">
                    <PublicPageHeader
                        eyebrow={t('Vote')}
                        title={award.title}
                        subtitle={event.name}
                        logoUrl={event.logo}
                        accentColor={event.accent_color}
                    />

                    <div className="flex flex-col gap-5 px-5 py-6">
                        {award.description && (
                            <p className="text-center text-sm text-neutral-600">
                                {award.description}
                            </p>
                        )}

                        {voter && (
                            <p className="rounded-md bg-emerald-50 px-3 py-2 text-center text-xs font-medium text-emerald-800">
                                {t('Voting as :name', { name: voter.name })}
                            </p>
                        )}

                        {award.is_paid && (
                            <p className="rounded-md bg-amber-50 px-3 py-2 text-center text-xs font-medium text-amber-900">
                                {t(
                                    'Each vote costs :price. Your votes are counted once your payment completes.',
                                    {
                                        price: formatRupiah(
                                            award.price_per_vote,
                                        ),
                                    },
                                )}
                            </p>
                        )}

                        {!award.is_open && (
                            <div className="flex flex-col items-center gap-2 rounded-md bg-neutral-100 px-3 py-4 text-center">
                                <Lock className="h-5 w-5 text-neutral-500" />
                                <p className="text-sm font-semibold text-neutral-700">
                                    {award.has_closed
                                        ? t('Voting has closed')
                                        : t('Voting is not open yet')}
                                </p>
                            </div>
                        )}

                        {errors.award_nominee_id && (
                            <p className="rounded-md bg-red-50 px-3 py-2 text-center text-xs font-medium text-red-700">
                                {errors.award_nominee_id}
                            </p>
                        )}
                        {errors.voter_token && (
                            <p className="rounded-md bg-red-50 px-3 py-2 text-center text-xs font-medium text-red-700">
                                {errors.voter_token}
                            </p>
                        )}

                        <div className="flex flex-col gap-2">
                            {nominees.length === 0 && (
                                <p className="py-6 text-center text-sm text-neutral-500">
                                    {t('Nobody is on this ballot yet.')}
                                </p>
                            )}

                            {nominees.map((nominee) => {
                                const isSelected = selected === nominee.id;
                                const share =
                                    totalVotes > 0
                                        ? ((nominee.votes_total ?? 0) /
                                              totalVotes) *
                                          100
                                        : 0;

                                return (
                                    <button
                                        key={nominee.id}
                                        type="button"
                                        disabled={!award.is_open}
                                        onClick={() => choose(nominee.id)}
                                        aria-pressed={isSelected}
                                        className={`flex items-center gap-3 rounded-xl border-2 px-3 py-2.5 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-70 ${
                                            isSelected
                                                ? 'border-[var(--accent-color)] bg-[var(--accent-color)]/5'
                                                : 'border-neutral-200 hover:border-neutral-400'
                                        }`}
                                    >
                                        {nominee.photo ? (
                                            <img
                                                src={formatImageUrl(
                                                    nominee.photo,
                                                )}
                                                alt=""
                                                className="h-11 w-11 shrink-0 rounded-full object-cover"
                                            />
                                        ) : (
                                            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-neutral-100">
                                                <Trophy className="h-5 w-5 text-neutral-400" />
                                            </span>
                                        )}

                                        <span className="min-w-0 flex-1">
                                            <span className="block truncate text-sm font-semibold text-neutral-900">
                                                {nominee.name}
                                            </span>
                                            {nominee.votes_total !== null && (
                                                <>
                                                    <span className="mt-1 block h-1.5 rounded-full bg-neutral-100">
                                                        <span
                                                            className="block h-1.5 rounded-full bg-[var(--accent-color)]"
                                                            style={{
                                                                width: `${share}%`,
                                                            }}
                                                        />
                                                    </span>
                                                    <span className="mt-1 block text-xs text-neutral-500">
                                                        {tc(
                                                            ':count vote|:count votes',
                                                            nominee.votes_total ??
                                                                0,
                                                        )}
                                                    </span>
                                                </>
                                            )}
                                        </span>

                                        {isSelected && (
                                            <Check className="h-5 w-5 shrink-0 text-[var(--accent-color)]" />
                                        )}
                                    </button>
                                );
                            })}
                        </div>

                        {!award.results_are_public && award.is_open && (
                            <p className="text-center text-xs text-neutral-500">
                                {t('Results are revealed when voting closes.')}
                            </p>
                        )}

                        {award.is_open && selected !== null && (
                            <div className="flex flex-col gap-4 border-t pt-4">
                                {award.is_paid && (
                                    <>
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm font-medium text-neutral-700">
                                                {t('Votes')}
                                            </span>
                                            <div className="flex items-center gap-2">
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="icon"
                                                    className="h-8 w-8"
                                                    aria-label={t(
                                                        'One fewer vote',
                                                    )}
                                                    onClick={() =>
                                                        adjustQuantity(-1)
                                                    }
                                                >
                                                    <Minus className="h-4 w-4" />
                                                </Button>
                                                <span className="w-10 text-center text-sm font-semibold tabular-nums">
                                                    {data.quantity}
                                                </span>
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="icon"
                                                    className="h-8 w-8"
                                                    aria-label={t(
                                                        'One more vote',
                                                    )}
                                                    onClick={() =>
                                                        adjustQuantity(1)
                                                    }
                                                >
                                                    <Plus className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </div>

                                        <Input
                                            placeholder={t('Your name')}
                                            value={data.voter_name}
                                            onChange={(event_) =>
                                                setData(
                                                    'voter_name',
                                                    event_.target.value,
                                                )
                                            }
                                        />
                                        {errors.voter_name && (
                                            <p className="text-xs text-red-600">
                                                {errors.voter_name}
                                            </p>
                                        )}

                                        <Input
                                            type="email"
                                            placeholder={t(
                                                'Email for the receipt',
                                            )}
                                            value={data.voter_email}
                                            onChange={(event_) =>
                                                setData(
                                                    'voter_email',
                                                    event_.target.value,
                                                )
                                            }
                                        />
                                        {errors.voter_email && (
                                            <p className="text-xs text-red-600">
                                                {errors.voter_email}
                                            </p>
                                        )}
                                    </>
                                )}

                                {/* Honeypot — hidden from real visitors. */}
                                <input
                                    type="text"
                                    tabIndex={-1}
                                    autoComplete="off"
                                    aria-hidden="true"
                                    className="hidden"
                                    value={data.website}
                                    onChange={(event_) =>
                                        setData('website', event_.target.value)
                                    }
                                />

                                <Button
                                    type="button"
                                    onClick={submit}
                                    disabled={processing}
                                    className="w-full"
                                >
                                    {processing
                                        ? t('Submitting…')
                                        : award.is_paid
                                          ? t('Pay :amount', {
                                                amount: formatRupiah(cost),
                                            })
                                          : t('Cast my vote')}
                                </Button>
                            </div>
                        )}

                        {!award.allows_anonymous && !voter && (
                            <p className="text-center text-xs text-neutral-500">
                                {t(
                                    'Open this page from your own ID card to vote.',
                                )}
                            </p>
                        )}

                        <button
                            type="button"
                            onClick={() => router.visit(`/events/${event.slug}`)}
                            className="text-center text-xs font-medium text-neutral-500 underline"
                        >
                            {t('Back to :event', { event: event.name })}
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
}
