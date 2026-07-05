import { Link, router } from '@inertiajs/react';
import {
    Users,
    LayoutGrid,
    Swords,
    Plus,
    Pencil,
    Trash2,
    Tag,
} from 'lucide-react';
import { DeleteConfirmationDialog } from '@/components/delete-confirmation-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { BasketballEventCategory } from '@/types/basketball-event-category';
import type { Event } from '@/types/event';
import { BasketballCategoryFormDialog } from './components/basketball-category-form-dialog';

export function BasketballManagement({
    event,
    categories = [],
}: {
    event: Event;
    categories?: BasketballEventCategory[];
}) {
    const handleDeleteCategory = (category: BasketballEventCategory) => {
        router.delete(
            `/dashboard/events/${event.id}/basketball-categories/${category.id}`,
        );
    };

    return (
        <section className="flex flex-col gap-4 rounded-xl border bg-card p-6 shadow-sm md:p-8">
            {event.specific_type === 'BasketballEvent' ? (
                <>
                    <h2 className="border-b pb-4 text-xl font-semibold tracking-tight">
                        Manajemen Turnamen Basket
                    </h2>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                        <Link
                            href={`/dashboard/events/${event.id}/teams`}
                            className="flex flex-col gap-2 rounded-lg border p-4 transition hover:bg-muted"
                        >
                            <Users className="h-5 w-5 text-primary" />
                            <span className="font-medium">Tim</span>
                            <span className="text-sm text-muted-foreground">
                                {event.teams_count ?? 0} tim terdaftar
                            </span>
                        </Link>

                        <Link
                            href={`/dashboard/events/${event.id}/pools`}
                            className="flex flex-col gap-2 rounded-lg border p-4 transition hover:bg-muted"
                        >
                            <LayoutGrid className="h-5 w-5 text-primary" />
                            <span className="font-medium">Pool</span>
                            <span className="text-sm text-muted-foreground">
                                {event.pools_count ?? 0} pool dibuat
                            </span>
                        </Link>

                        <Link
                            href={`/dashboard/events/${event.id}/matches`}
                            className="flex flex-col gap-2 rounded-lg border p-4 transition hover:bg-muted"
                        >
                            <Swords className="h-5 w-5 text-primary" />
                            <span className="font-medium">Pertandingan</span>
                            <span className="text-sm text-muted-foreground">
                                {event.matches_count ?? 0} match dijadwalkan
                            </span>
                        </Link>
                    </div>

                    <div className="flex flex-col gap-4 border-t pt-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="font-medium">
                                    Kategori Pertandingan
                                </h3>
                                <p className="text-sm text-muted-foreground">
                                    Atur kategori seperti kelompok usia atau
                                    divisi
                                </p>
                            </div>
                            <BasketballCategoryFormDialog
                                event={event}
                                trigger={
                                    <Button size="sm">
                                        <Plus className="mr-2 h-4 w-4" />
                                        Tambah Kategori
                                    </Button>
                                }
                            />
                        </div>

                        {categories.length === 0 ? (
                            <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed py-8 text-center text-muted-foreground">
                                <Tag className="h-5 w-5" />
                                <p className="text-sm">
                                    Belum ada kategori yang dibuat.
                                </p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                {categories.map((category) => (
                                    <div
                                        key={category.id}
                                        className="flex flex-col gap-2 rounded-lg border p-4"
                                    >
                                        <div className="flex items-start justify-between gap-2">
                                            <span className="font-medium">
                                                {category.name}
                                            </span>
                                            <Badge variant="secondary">
                                                {category.status}
                                            </Badge>
                                        </div>
                                        <p className="text-sm text-muted-foreground">
                                            {category.min_team}
                                            {category.max_team
                                                ? `–${category.max_team}`
                                                : '+'}{' '}
                                            tim &middot;{' '}
                                            {category.min_player_per_team}
                                            {category.max_player_per_team
                                                ? `–${category.max_player_per_team}`
                                                : '+'}{' '}
                                            pemain/tim
                                        </p>
                                        {category.price && (
                                            <p className="text-sm text-muted-foreground">
                                                Rp
                                                {Number(
                                                    category.price,
                                                ).toLocaleString('id-ID')}
                                            </p>
                                        )}
                                        <div className="mt-1 flex justify-end gap-1">
                                            <BasketballCategoryFormDialog
                                                event={event}
                                                category={category}
                                                trigger={
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8"
                                                    >
                                                        <Pencil className="h-4 w-4" />
                                                    </Button>
                                                }
                                            />
                                            <DeleteConfirmationDialog
                                                trigger={
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-destructive"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                }
                                                confirmationValue={
                                                    category.name
                                                }
                                                description={
                                                    <>
                                                        Ini akan menghapus
                                                        kategori{' '}
                                                        <span className="font-semibold">
                                                            {category.name}
                                                        </span>{' '}
                                                        secara permanen.
                                                    </>
                                                }
                                                onConfirm={() =>
                                                    handleDeleteCategory(
                                                        category,
                                                    )
                                                }
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </>
            ) : (
                <div className="flex flex-col items-center justify-center gap-4 py-8 text-center">
                    <div className="space-y-2">
                        <h3 className="text-lg font-medium">
                            Turnamen Basket
                        </h3>
                        <p className="text-sm text-muted-foreground">
                            Event ini belum dikonfigurasi sebagai turnamen
                            basket.
                        </p>
                    </div>
                    <Button
                        onClick={() =>
                            router.post(`/events/${event.id}/basketball`)
                        }
                    >
                        Buat Turnamen Basket
                    </Button>
                </div>
            )}
        </section>
    );
}