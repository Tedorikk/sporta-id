import { Head, Link, router } from '@inertiajs/react';
import {
    ChevronLeft,
    Download,
    ExternalLink,
    Printer,
    Search,
    Undo2,
    Users,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { LocalTime } from '@/components/local-time';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { formatRupiah } from '@/lib/format-currency';

import type { Event } from '@/types/event';
import type { Payment, PaymentStatus } from '@/types/payment';
import type {
    PaginatedRegistrations,
    Registration,
    RegistrationFilters,
    RegistrationStatus,
} from '@/types/registration';
import type { RegistrationCategory } from '@/types/registration-category';

interface Props {
    event: Event;
    registrationCategory: RegistrationCategory;
    registrations: PaginatedRegistrations;
    filters: RegistrationFilters;
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

const RESERVED_KEYS = ['name', 'email', 'phone', 'photo'];

const PAYMENT_VARIANT: Record<
    PaymentStatus,
    'default' | 'secondary' | 'destructive' | 'outline'
> = {
    pending: 'secondary',
    settlement: 'default',
    refund: 'outline',
    expire: 'outline',
    cancel: 'outline',
    deny: 'destructive',
    failure: 'destructive',
};

/** Order id, amount, method and paid-at — enough to reconcile a disputed payment here. */
function PaymentCell({ payment }: { payment: Payment | null }) {
    if (!payment) {
        return <span className="text-muted-foreground">—</span>;
    }

    return (
        <div className="flex flex-col gap-1">
            <Badge
                variant={PAYMENT_VARIANT[payment.status]}
                className="w-fit capitalize"
            >
                {payment.status}
            </Badge>
            <span className="font-medium">{formatRupiah(payment.amount)}</span>
            <span className="font-mono text-xs text-muted-foreground">
                {payment.order_id}
            </span>
            {payment.payment_type && (
                <span className="text-xs text-muted-foreground capitalize">
                    {payment.payment_type.replace(/_/g, ' ')}
                </span>
            )}
            {payment.paid_at && (
                <span className="text-xs text-muted-foreground">
                    <LocalTime value={payment.paid_at} />
                </span>
            )}
        </div>
    );
}

function EmptyState() {
    return (
        <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed py-14 text-center">
            <Users className="h-6 w-6 text-muted-foreground" />
            <p className="text-sm font-medium">No registrations found</p>
            <p className="max-w-sm text-sm text-muted-foreground">
                Once people sign up through the public registration link,
                they'll show up here.
            </p>
        </div>
    );
}

export default function RegistrationCategoryShow({
    event,
    registrationCategory,
    registrations,
    filters,
}: Props) {
    const [search, setSearch] = useState(filters.search ?? '');
    const [refunding, setRefunding] = useState<Registration | null>(null);
    const [refundNote, setRefundNote] = useState('');
    const [isRefunding, setIsRefunding] = useState(false);

    const isPaidCategory =
        Boolean(registrationCategory.price) &&
        Number(registrationCategory.price) > 0;

    const submitRefund = () => {
        if (!refunding) {
            return;
        }

        setIsRefunding(true);

        router.post(
            `/dashboard/events/${event.id}/registrations/${refunding.id}/refund`,
            { note: refundNote },
            {
                preserveScroll: true,
                onFinish: () => {
                    setIsRefunding(false);
                    setRefunding(null);
                    setRefundNote('');
                },
            },
        );
    };

    const customFields = (registrationCategory.form_pages ?? [])
        .flatMap((page) => page.fields)
        .filter((f) => !RESERVED_KEYS.includes(f.key));

    // Batch print sheet for the whole category; append `?ids=` to reprint one card.
    const idCardPrintUrl = `/dashboard/events/${event.id}/registration-categories/${registrationCategory.id}/id-cards`;

    useEffect(() => {
        const timeout = setTimeout(() => {
            if (search === (filters.search ?? '')) {
                return;
            }

            applyFilters({ search: search || undefined });
        }, 400);

        return () => clearTimeout(timeout);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [search]);

    // Pragmatic stand-in for real-time: quietly refresh the response list on
    // an interval instead of pulling in a websocket/broadcasting stack.
    useEffect(() => {
        const interval = setInterval(() => {
            if (document.visibilityState !== 'visible') {
                return;
            }

            router.reload({ only: ['registrations'], showProgress: false });
        }, 15000);

        return () => clearInterval(interval);
    }, []);

    function applyFilters(next: Partial<RegistrationFilters>) {
        router.get(
            `/dashboard/events/${event.id}/registration-categories/${registrationCategory.id}`,
            { ...filters, ...next },
            { preserveScroll: true, preserveState: true, replace: true },
        );
    }

    return (
        <div className="mx-auto flex h-full w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-6 md:px-8 md:py-8">
            <Head
                title={`${registrationCategory.name} Registrations · ${event.name}`}
            />

            <div className="flex items-center gap-4">
                <Button
                    variant="outline"
                    size="icon"
                    className="h-10 w-10 shrink-0"
                    asChild
                >
                    <Link
                        href={`/dashboard/events/${event.id}/registration-categories`}
                        aria-label="Back to registration categories"
                    >
                        <ChevronLeft className="h-5 w-5" />
                    </Link>
                </Button>
                <div className="flex-1">
                    <h1 className="text-2xl font-bold tracking-tight">
                        {registrationCategory.name}
                    </h1>
                    <p className="text-sm text-muted-foreground">
                        {event.name} · {registrations.total} registration
                        {registrations.total !== 1 ? 's' : ''}
                    </p>
                </div>
                {registrationCategory.subject_type === 'individual' && (
                    <Button variant="outline" size="sm" asChild>
                        <a
                            href={idCardPrintUrl}
                            target="_blank"
                            rel="noreferrer"
                        >
                            <Printer className="mr-2 h-4 w-4" />
                            Print ID cards
                        </a>
                    </Button>
                )}
                <Button variant="outline" size="sm" asChild>
                    <a
                        href={`/dashboard/events/${event.id}/registration-categories/${registrationCategory.id}/responses/export`}
                    >
                        <Download className="mr-2 h-4 w-4" />
                        Export CSV
                    </a>
                </Button>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="relative flex-1">
                    <Search className="absolute top-2.5 left-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search by name..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-8"
                    />
                </div>

                <Select
                    value={filters.status ?? 'all'}
                    onValueChange={(value) =>
                        applyFilters({
                            status: value === 'all' ? undefined : value,
                        })
                    }
                >
                    <SelectTrigger className="w-full sm:w-48">
                        <SelectValue placeholder="All statuses" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All statuses</SelectItem>
                        <SelectItem value="pending_payment">
                            Pending Payment
                        </SelectItem>
                        <SelectItem value="confirmed">Confirmed</SelectItem>
                        <SelectItem value="rejected">Rejected</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                        <SelectItem value="expired">Expired</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {registrations.data.length === 0 ? (
                <EmptyState />
            ) : (
                <div className="rounded-lg border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead>Email</TableHead>
                                <TableHead>Phone</TableHead>
                                {customFields.map((field) => (
                                    <TableHead key={field.key}>
                                        {field.label}
                                    </TableHead>
                                ))}
                                {registrationCategory.subject_type ===
                                    'team' && (
                                    <TableHead>Team Status</TableHead>
                                )}
                                <TableHead>Status</TableHead>
                                {isPaidCategory && (
                                    <TableHead>Payment</TableHead>
                                )}
                                <TableHead>Registered At</TableHead>
                                <TableHead />
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {registrations.data.map((registration) => (
                                <TableRow key={registration.id}>
                                    <TableCell className="font-medium">
                                        {registration.name}
                                    </TableCell>
                                    <TableCell className="text-muted-foreground">
                                        {registration.email ?? '—'}
                                    </TableCell>
                                    <TableCell className="text-muted-foreground">
                                        {registration.phone ?? '—'}
                                    </TableCell>
                                    {customFields.map((field) => {
                                        const rawValue =
                                            registration.form_data?.[field.key];

                                        return (
                                            <TableCell
                                                key={field.key}
                                                className="text-muted-foreground"
                                            >
                                                {(field.type === 'file' ||
                                                    field.type ===
                                                        'document') &&
                                                rawValue ? (
                                                    <a
                                                        href={String(rawValue)}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="text-primary underline underline-offset-2"
                                                    >
                                                        View
                                                    </a>
                                                ) : (
                                                    String(rawValue ?? '—')
                                                )}
                                            </TableCell>
                                        );
                                    })}
                                    {registrationCategory.subject_type ===
                                        'team' && (
                                        <TableCell>
                                            {registration.team ? (
                                                <Badge variant="outline">
                                                    {registration.team.status}
                                                </Badge>
                                            ) : (
                                                '—'
                                            )}
                                        </TableCell>
                                    )}
                                    <TableCell>
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
                                    </TableCell>
                                    {isPaidCategory && (
                                        <TableCell>
                                            <PaymentCell
                                                payment={
                                                    registration.payment ?? null
                                                }
                                            />
                                        </TableCell>
                                    )}
                                    <TableCell className="text-muted-foreground">
                                        <LocalTime
                                            value={registration.created_at}
                                        />
                                    </TableCell>
                                    <TableCell>
                                        {registrationCategory.subject_type ===
                                            'individual' && (
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                asChild
                                            >
                                                <a
                                                    href={`/registrations/${registration.qr_token}/id-card`}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                >
                                                    <ExternalLink className="h-4 w-4" />
                                                </a>
                                            </Button>
                                        )}
                                        {registrationCategory.subject_type ===
                                            'individual' &&
                                            registration.status ===
                                                'confirmed' && (
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    title="Print this ID card"
                                                    asChild
                                                >
                                                    <a
                                                        href={`${idCardPrintUrl}?ids=${registration.id}`}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                    >
                                                        <Printer className="h-4 w-4" />
                                                    </a>
                                                </Button>
                                            )}
                                        {registrationCategory.subject_type ===
                                            'team' &&
                                            registration.team_id && (
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    asChild
                                                >
                                                    <a
                                                        href={`/teams/${registration.team_id}/id-card`}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                    >
                                                        <ExternalLink className="h-4 w-4" />
                                                    </a>
                                                </Button>
                                            )}
                                        {registration.payment?.status ===
                                            'settlement' && (
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                title="Record a refund"
                                                onClick={() =>
                                                    setRefunding(registration)
                                                }
                                            >
                                                <Undo2 className="h-4 w-4" />
                                            </Button>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            )}

            {registrations.last_page > 1 && (
                <nav className="flex items-center justify-center gap-1 py-4">
                    {registrations.links.map((link, i) => (
                        <Button
                            key={i}
                            variant={link.active ? 'default' : 'outline'}
                            size="sm"
                            disabled={!link.url}
                            onClick={() =>
                                link.url &&
                                router.visit(link.url, {
                                    preserveState: true,
                                    preserveScroll: true,
                                })
                            }
                            dangerouslySetInnerHTML={{ __html: link.label }}
                        />
                    ))}
                </nav>
            )}

            <Dialog
                open={refunding !== null}
                onOpenChange={(open) => !open && setRefunding(null)}
            >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Record a refund</DialogTitle>
                        <DialogDescription>
                            This records the refund against{' '}
                            <strong>{refunding?.name}</strong>, cancels their
                            registration, and returns the slot to the quota so
                            it can be resold.
                            <br />
                            <br />
                            It does <strong>not</strong> move any money — issue
                            the actual refund in your Midtrans dashboard for
                            order{' '}
                            <span className="font-mono">
                                {refunding?.payment?.order_id}
                            </span>
                            .
                        </DialogDescription>
                    </DialogHeader>

                    <div className="flex flex-col gap-2">
                        <Label htmlFor="refund-note">Note (optional)</Label>
                        <Input
                            id="refund-note"
                            value={refundNote}
                            onChange={(e) => setRefundNote(e.target.value)}
                            placeholder="e.g. Cancelled 40 days out — full refund per policy"
                        />
                    </div>

                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setRefunding(null)}
                            disabled={isRefunding}
                        >
                            Cancel
                        </Button>
                        <Button onClick={submitRefund} disabled={isRefunding}>
                            {isRefunding ? 'Recording…' : 'Record refund'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
