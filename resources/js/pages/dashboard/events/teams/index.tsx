import { Head, Link, router } from '@inertiajs/react';
import { ChevronLeft, Plus, Pencil, Trash2, Search, CheckCircle, XCircle, Clock } from 'lucide-react';
import { useState } from 'react';
import { DeleteConfirmationDialog } from '@/components/delete-confirmation-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { Event } from '@/types/event';

interface Team {
    id: number;
    event_id: number;
    name: string;
    manager_name: string;
    manager_phone: string;
    logo: string | null;
    status: 'pending' | 'verified' | 'rejected';
}

interface TeamsIndexProps {
    event: Event;
    teams: {
        data: Team[];
        links: { url: string | null; label: string; active: boolean }[];
    };
    filters: { search?: string };
}

export default function TeamsIndex({ event, teams, filters }: TeamsIndexProps) {
    const [search, setSearch] = useState(filters.search || '');
    const [deletingTeam, setDeletingTeam] = useState<Team | null>(null);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        router.get(`/dashboard/events/${event.id}/teams`, { search }, { preserveState: true });
    };

    return (
        <div className="mx-auto flex h-full w-full max-w-6xl flex-1 flex-col gap-8 overflow-x-hidden px-4 py-6 md:px-8 md:py-8">
            <Head title={`Tim - ${event.name}`} />

            <section className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-4">
                    <Button variant="outline" size="icon" className="mt-1 h-10 w-10 shrink-0" asChild>
                        <Link href={`/dashboard/events/${event.id}`}>
                            <ChevronLeft className="h-5 w-5" />
                        </Link>
                    </Button>
                    <div className="flex flex-col gap-2">
                        <h1 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
                            Manajemen Tim
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            Kelola tim yang terdaftar di turnamen {event.name}
                        </p>
                    </div>
                </div>
                <Button asChild>
                    <Link href={`/dashboard/events/${event.id}/teams/create`}>
                        <Plus className="mr-2 h-4 w-4" />
                        Tambah Tim
                    </Link>
                </Button>
            </section>

            <section className="flex flex-col gap-4 rounded-xl border bg-card p-6 shadow-sm">
                <div className="flex items-center justify-between">
                    <form onSubmit={handleSearch} className="relative w-full max-w-sm">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground ml-2" />
                        <Input
                            type="search"
                            placeholder="Cari nama tim..."
                            className="pl-10"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </form>
                </div>

                <div className="rounded-md border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Nama Tim</TableHead>
                                <TableHead>Manager</TableHead>
                                <TableHead>Kontak</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Aksi</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {teams.data.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-24 text-center">
                                        Tidak ada tim yang ditemukan.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                teams.data.map((team) => (
                                    <TableRow key={team.id}>
                                        <TableCell className="font-medium">
                                            <div className="flex items-center gap-3">
                                                {team.logo ? (
                                                    <img src={team.logo} alt={team.name} className="h-8 w-8 rounded-full object-cover" />
                                                ) : (
                                                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-xs">
                                                        {team.name.substring(0, 2).toUpperCase()}
                                                    </div>
                                                )}
                                                {team.name}
                                            </div>
                                        </TableCell>
                                        <TableCell>{team.manager_name}</TableCell>
                                        <TableCell>{team.manager_phone}</TableCell>
                                        <TableCell>
                                            {team.status === 'verified' && (
                                                <Badge variant="default" className="bg-emerald-500 hover:bg-emerald-600"><CheckCircle className="mr-1 h-3 w-3" /> Terverifikasi</Badge>
                                            )}
                                            {team.status === 'pending' && (
                                                <Badge variant="secondary"><Clock className="mr-1 h-3 w-3" /> Menunggu</Badge>
                                            )}
                                            {team.status === 'rejected' && (
                                                <Badge variant="destructive"><XCircle className="mr-1 h-3 w-3" /> Ditolak</Badge>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-2">
                                                <Button variant="ghost" size="icon" asChild>
                                                    <Link href={`/dashboard/events/${event.id}/teams/${team.id}/edit`}>
                                                        <Pencil className="h-4 w-4" />
                                                    </Link>
                                                </Button>
                                                <DeleteConfirmationDialog
                                                    trigger={
                                                        <Button variant="ghost" size="icon" className="text-destructive">
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    }
                                                    confirmationValue={team.name}
                                                    description={
                                                        <>
                                                            Ini akan menghapus tim <span className="font-semibold">{team.name}</span> secara permanen.
                                                        </>
                                                    }
                                                    onConfirm={() => {
                                                        setDeletingTeam(team);
                                                        router.delete(`/dashboard/events/${event.id}/teams/${team.id}`);
                                                    }}
                                                />
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            </section>
        </div>
    );
}

TeamsIndex.layout = {
    breadcrumbs: [
        { title: 'Events', href: '/dashboard/events' },
        { title: 'Teams', href: '#' },
    ],
};
