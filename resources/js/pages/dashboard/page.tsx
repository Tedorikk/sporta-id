import { Head, Link } from '@inertiajs/react';
import {
    AlertTriangle,
    ArrowRight,
    CalendarClock,
    CircleDollarSign,
    Clock,
    Inbox,
    Ticket,
    TrendingUp,
    Users,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { LocalTime } from '@/components/local-time';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatRupiah } from '@/lib/format-currency';
import { formatDate } from '@/lib/format-date';
import { dashboard } from '@/routes';
import type { Event } from '@/types/event';
import type { RegistrationStatus } from '@/types/registration';

interface Stats {
    events_ongoing: number;
    events_upcoming: number;
    events_draft: number;
    registrations_confirmed: number;
    registrations_pending: number;
    revenue_settled: number;
    revenue_pending: number;
}

type ActiveEvent = Event & {
    quota_total: number | null;
    registered_total: number;
    price_from: string | null;
};

interface RecentRegistration {
    id: number;
    name: string;
    status: RegistrationStatus;
    created_at: string;
    event_name: string | null;
    category_name: string | null;
    price: string | null;
}

interface Attention {
    payments_expiring_soon: number;
    categories_nearly_full: number;
    unpublished_starting_soon: number;
    contact_messages_this_week: number;
}

interface Props {
    stats: Stats;
    activeEvents: ActiveEvent[];
    recentRegistrations: RecentRegistration[];
    attention: Attention;
}

const STATUS_VARIANT: Record<
    RegistrationStatus,
    'default' | 'secondary' | 'destructive' | 'outline'
> = {
    pending_payment: 'secondary',
    confirmed: 'default',
    rejected: 'destructive',
    cancelled: 'outline',
    expired: 'outline',
};

function StatTile({
    icon: Icon,
    label,
    value,
    hint,
}: {
    icon: LucideIcon;
    label: string;
    value: string;
    hint?: string;
}) {
    return (
        <div className="flex flex-col gap-1 rounded-xl border border-sidebar-border/70 p-4 dark:border-sidebar-border">
            <div className="flex items-center gap-2 text-muted-foreground">
                <Icon className="h-4 w-4" />
                <span className="text-xs font-medium tracking-wide uppercase">
                    {label}
                </span>
            </div>
            <span className="text-2xl font-bold tabular-nums">{value}</span>
            {hint && (
                <span className="text-xs text-muted-foreground">{hint}</span>
            )}
        </div>
    );
}

function Panel({
    title,
    action,
    children,
}: {
    title: string;
    action?: { label: string; href: string };
    children: React.ReactNode;
}) {
    return (
        <section className="flex flex-col rounded-xl border border-sidebar-border/70 dark:border-sidebar-border">
            <header className="flex items-center justify-between border-b border-sidebar-border/70 px-4 py-3 dark:border-sidebar-border">
                <h2 className="text-sm font-semibold">{title}</h2>
                {action && (
                    <Button variant="ghost" size="sm" asChild>
                        <Link href={action.href}>
                            {action.label}
                            <ArrowRight className="ml-1 h-3.5 w-3.5" />
                        </Link>
                    </Button>
                )}
            </header>
            <div className="flex-1 p-4">{children}</div>
        </section>
    );
}

function Empty({ children }: { children: React.ReactNode }) {
    return (
        <p className="py-6 text-center text-sm text-muted-foreground">
            {children}
        </p>
    );
}

export default function Dashboard({
    stats,
    activeEvents,
    recentRegistrations,
    attention,
}: Props) {
    const alerts = [
        {
            show: attention.payments_expiring_soon > 0,
            icon: Clock,
            text: `${attention.payments_expiring_soon} unpaid registration${attention.payments_expiring_soon === 1 ? '' : 's'} expiring within 24 hours`,
        },
        {
            show: attention.categories_nearly_full > 0,
            icon: TrendingUp,
            text: `${attention.categories_nearly_full} categor${attention.categories_nearly_full === 1 ? 'y is' : 'ies are'} at 90% of quota or higher`,
        },
        {
            show: attention.unpublished_starting_soon > 0,
            icon: AlertTriangle,
            text: `${attention.unpublished_starting_soon} unpublished event${attention.unpublished_starting_soon === 1 ? '' : 's'} start${attention.unpublished_starting_soon === 1 ? 's' : ''} within 14 days`,
        },
        {
            show: attention.contact_messages_this_week > 0,
            icon: Inbox,
            text: `${attention.contact_messages_this_week} contact message${attention.contact_messages_this_week === 1 ? '' : 's'} this week`,
        },
    ].filter((alert) => alert.show);

    return (
        <>
            <Head title="Dashboard" />

            <div className="flex h-full flex-1 flex-col gap-4 overflow-x-auto p-4">
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    <StatTile
                        icon={CalendarClock}
                        label="Events"
                        value={String(
                            stats.events_ongoing + stats.events_upcoming,
                        )}
                        hint={`${stats.events_ongoing} running now · ${stats.events_upcoming} upcoming${stats.events_draft > 0 ? ` · ${stats.events_draft} draft` : ''}`}
                    />
                    <StatTile
                        icon={Users}
                        label="Confirmed"
                        value={stats.registrations_confirmed.toLocaleString(
                            'id-ID',
                        )}
                        hint="Registrations across all your events"
                    />
                    <StatTile
                        icon={CircleDollarSign}
                        label="Revenue"
                        value={formatRupiah(String(stats.revenue_settled))}
                        hint="Settled payments only"
                    />
                    <StatTile
                        icon={Clock}
                        label="Awaiting payment"
                        value={stats.registrations_pending.toLocaleString(
                            'id-ID',
                        )}
                        hint={
                            stats.revenue_pending > 0
                                ? `${formatRupiah(String(stats.revenue_pending))} not yet settled`
                                : 'Nothing outstanding'
                        }
                    />
                </div>

                {alerts.length > 0 && (
                    <section className="flex flex-col gap-2 rounded-xl border border-amber-500/40 bg-amber-50 p-4 dark:bg-amber-950/20">
                        <h2 className="text-sm font-semibold text-amber-900 dark:text-amber-200">
                            Needs attention
                        </h2>
                        {alerts.map((alert) => {
                            const Icon = alert.icon;

                            return (
                                <div
                                    key={alert.text}
                                    className="flex items-center gap-2 text-sm text-amber-900 dark:text-amber-200"
                                >
                                    <Icon className="h-4 w-4 shrink-0" />
                                    {alert.text}
                                </div>
                            );
                        })}
                    </section>
                )}

                <div className="grid flex-1 gap-4 lg:grid-cols-2">
                    <Panel
                        title="Happening now & next"
                        action={{
                            label: 'All events',
                            href: '/dashboard/events',
                        }}
                    >
                        {activeEvents.length === 0 ? (
                            <Empty>
                                No current or upcoming events.{' '}
                                <Link
                                    href="/dashboard/events/create"
                                    className="text-primary underline underline-offset-2"
                                >
                                    Create one
                                </Link>
                                .
                            </Empty>
                        ) : (
                            <ul className="flex flex-col gap-3">
                                {activeEvents.map((event) => {
                                    const pct =
                                        event.quota_total &&
                                        event.quota_total > 0
                                            ? Math.min(
                                                  Math.round(
                                                      (event.registered_total /
                                                          event.quota_total) *
                                                          100,
                                                  ),
                                                  100,
                                              )
                                            : null;

                                    return (
                                        <li key={event.id}>
                                            <Link
                                                href={`/dashboard/events/${event.id}`}
                                                className="flex flex-col gap-2 rounded-lg border border-transparent p-2 transition hover:border-sidebar-border/70 hover:bg-muted/50"
                                            >
                                                <div className="flex items-start justify-between gap-3">
                                                    <div className="flex min-w-0 flex-col">
                                                        <span className="truncate text-sm font-semibold">
                                                            {event.name}
                                                        </span>
                                                        <span className="text-xs text-muted-foreground">
                                                            {formatDate(
                                                                event.start_date,
                                                            )}{' '}
                                                            –{' '}
                                                            {formatDate(
                                                                event.end_date,
                                                            )}
                                                        </span>
                                                    </div>
                                                    <div className="flex shrink-0 items-center gap-2">
                                                        {!event.is_published && (
                                                            <Badge variant="outline">
                                                                Draft
                                                            </Badge>
                                                        )}
                                                        <Badge
                                                            variant={
                                                                event.status ===
                                                                'ongoing'
                                                                    ? 'default'
                                                                    : 'secondary'
                                                            }
                                                            className="capitalize"
                                                        >
                                                            {event.status}
                                                        </Badge>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-3">
                                                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                                                        <div
                                                            className="h-full rounded-full bg-primary"
                                                            style={{
                                                                width: `${pct ?? 0}%`,
                                                            }}
                                                        />
                                                    </div>
                                                    <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                                                        {event.registered_total}
                                                        {event.quota_total
                                                            ? ` / ${event.quota_total}`
                                                            : ' registered'}
                                                    </span>
                                                </div>
                                            </Link>
                                        </li>
                                    );
                                })}
                            </ul>
                        )}
                    </Panel>

                    <Panel title="Latest registrations">
                        {recentRegistrations.length === 0 ? (
                            <Empty>No registrations yet.</Empty>
                        ) : (
                            <ul className="flex flex-col divide-y divide-sidebar-border/70 dark:divide-sidebar-border">
                                {recentRegistrations.map((registration) => (
                                    <li
                                        key={registration.id}
                                        className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0"
                                    >
                                        <div className="flex min-w-0 flex-col">
                                            <span className="truncate text-sm font-medium">
                                                {registration.name}
                                            </span>
                                            <span className="truncate text-xs text-muted-foreground">
                                                {registration.category_name} ·{' '}
                                                {registration.event_name}
                                            </span>
                                        </div>
                                        <div className="flex shrink-0 flex-col items-end gap-1">
                                            <Badge
                                                variant={
                                                    STATUS_VARIANT[
                                                        registration.status
                                                    ]
                                                }
                                                className="capitalize"
                                            >
                                                {registration.status.replace(
                                                    '_',
                                                    ' ',
                                                )}
                                            </Badge>
                                            <span className="text-[11px] text-muted-foreground">
                                                <LocalTime
                                                    value={
                                                        registration.created_at
                                                    }
                                                />
                                            </span>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </Panel>
                </div>

                <div className="flex flex-wrap gap-2">
                    <Button asChild size="sm">
                        <Link href="/dashboard/events/create">
                            <Ticket className="mr-1 h-4 w-4" />
                            New event
                        </Link>
                    </Button>
                    <Button asChild size="sm" variant="outline">
                        <Link href="/dashboard/qr-scanner">
                            Open QR scanner
                        </Link>
                    </Button>
                    <Button asChild size="sm" variant="outline">
                        <Link href="/dashboard/contact-messages">
                            Contact messages
                        </Link>
                    </Button>
                </div>
            </div>
        </>
    );
}

Dashboard.layout = {
    breadcrumbs: [
        {
            title: 'Dashboard',
            href: dashboard(),
        },
    ],
};
