import { Head, Link, router } from '@inertiajs/react';
import { ChevronLeft, ExternalLink, Search, Users } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatDateTime } from '@/lib/format-date';
import type { Event } from '@/types/event';
import type { PaginatedRegistrations, RegistrationFilters, RegistrationStatus } from '@/types/registration';
import type { RegistrationCategory } from '@/types/registration-category';

interface Props {
    event: Event;
    registrationCategory: RegistrationCategory;
    registrations: PaginatedRegistrations;
    filters: RegistrationFilters;
}

const STATUS_VARIANT: Record<RegistrationStatus, 'default' | 'secondary' | 'destructive' | 'outline'> = {
    pending_payment: 'secondary',
    confirmed: 'default',
    rejected: 'destructive',
    cancelled: 'outline',
    expired: 'outline',
};

const RESERVED_KEYS = ['name', 'email', 'phone', 'photo'];

function EmptyState() {
    return (
        <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed py-14 text-center">
            <Users className="h-6 w-6 text-muted-foreground" />
            <p className="text-sm font-medium">No registrations found</p>
            <p className="max-w-sm text-sm text-muted-foreground">
                Once people sign up through the public registration link, they'll show up here.
            </p>
        </div>
    );
}

export default function RegistrationCategoryShow({ event, registrationCategory, registrations, filters }: Props) {
    const [search, setSearch] = useState(filters.search ?? '');

    const customFields = (registrationCategory.form_schema ?? []).filter((f) => !RESERVED_KEYS.includes(f.key));

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

    function applyFilters(next: Partial<RegistrationFilters>) {
        router.get(
            `/dashboard/events/${event.id}/registration-categories/${registrationCategory.id}`,
            { ...filters, ...next },
            { preserveScroll: true, preserveState: true, replace: true },
        );
    }

    return (
        <div className="mx-auto flex h-full w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-6 md:px-8 md:py-8">
            <Head title={`${registrationCategory.name} Registrations · ${event.name}`} />

            <div className="flex items-center gap-4">
                <Button variant="outline" size="icon" className="h-10 w-10 shrink-0" asChild>
                    <Link href={`/dashboard/events/${event.id}/registration-categories`} aria-label="Back to registration categories">
                        <ChevronLeft className="h-5 w-5" />
                    </Link>
                </Button>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">{registrationCategory.name}</h1>
                    <p className="text-sm text-muted-foreground">
                        {event.name} · {registrations.total} registration{registrations.total !== 1 ? 's' : ''}
                    </p>
                </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="relative flex-1">
                    <Search className="absolute top-2.5 left-2.5 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="Search by name..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8" />
                </div>

                <Select value={filters.status ?? 'all'} onValueChange={(value) => applyFilters({ status: value === 'all' ? undefined : value })}>
                    <SelectTrigger className="w-full sm:w-48">
                        <SelectValue placeholder="All statuses" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All statuses</SelectItem>
                        <SelectItem value="pending_payment">Pending Payment</SelectItem>
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
                                    <TableHead key={field.key}>{field.label}</TableHead>
                                ))}
                                {registrationCategory.subject_type === 'team' && <TableHead>Team Status</TableHead>}
                                <TableHead>Status</TableHead>
                                <TableHead>Registered At</TableHead>
                                <TableHead />
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {registrations.data.map((registration) => (
                                <TableRow key={registration.id}>
                                    <TableCell className="font-medium">{registration.name}</TableCell>
                                    <TableCell className="text-muted-foreground">{registration.email ?? '—'}</TableCell>
                                    <TableCell className="text-muted-foreground">{registration.phone ?? '—'}</TableCell>
                                    {customFields.map((field) => (
                                        <TableCell key={field.key} className="text-muted-foreground">
                                            {String(registration.form_data?.[field.key] ?? '—')}
                                        </TableCell>
                                    ))}
                                    {registrationCategory.subject_type === 'team' && (
                                        <TableCell>
                                            {registration.team ? <Badge variant="outline">{registration.team.status}</Badge> : '—'}
                                        </TableCell>
                                    )}
                                    <TableCell>
                                        <Badge variant={STATUS_VARIANT[registration.status]} className="capitalize">
                                            {registration.status.replace('_', ' ')}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-muted-foreground">{formatDateTime(registration.created_at)}</TableCell>
                                    <TableCell>
                                        {registrationCategory.subject_type === 'individual' && (
                                            <Button variant="ghost" size="icon" asChild>
                                                <a href={`/registrations/${registration.id}/id-card`} target="_blank" rel="noreferrer">
                                                    <ExternalLink className="h-4 w-4" />
                                                </a>
                                            </Button>
                                        )}
                                        {registrationCategory.subject_type === 'team' && registration.team_id && (
                                            <Button variant="ghost" size="icon" asChild>
                                                <a href={`/teams/${registration.team_id}/id-card`} target="_blank" rel="noreferrer">
                                                    <ExternalLink className="h-4 w-4" />
                                                </a>
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
                            onClick={() => link.url && router.visit(link.url, { preserveState: true, preserveScroll: true })}
                            dangerouslySetInnerHTML={{ __html: link.label }}
                        />
                    ))}
                </nav>
            )}
        </div>
    );
}
