import { Link, router } from '@inertiajs/react';
import { Users, LayoutGrid, Swords } from 'lucide-react';
import type { Event } from '@/types/event';
import { Button } from '@/components/ui/button';

export function BasketballManagement({ event }: { event: Event }) {
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
                </>
            ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center gap-4">
                <div className="space-y-2">
                    <h3 className="text-lg font-medium">Turnamen Basket</h3>
                    <p className="text-sm text-muted-foreground">
                        Event ini belum dikonfigurasi sebagai turnamen basket.
                    </p>
                </div>
                <Button onClick={() => router.post(`/events/${event.id}/basketball`)}>
                    Buat Turnamen Basket
                </Button>
            </div>
            )}
        </section>
    );
}
