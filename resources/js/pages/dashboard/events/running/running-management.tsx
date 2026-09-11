import { Link, router } from '@inertiajs/react';
import {
    Clock,
    Flag,
    ListOrdered,
    Pencil,
    Plus,
    Timer,
    Trash2,
    Users,
} from 'lucide-react';
import { DeleteConfirmationDialog } from '@/components/delete-confirmation-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatRupiah } from '@/lib/format-currency';
import { formatDateTime } from '@/lib/format-date';
import { formatDistance } from '@/lib/format-race';
import type { Event } from '@/types/event';
import type { RegistrationCategory } from '@/types/registration-category';
import type { RunningEventCategory } from '@/types/running-event-category';
import { RunningCategoryFormDialog } from './components/running-category-form-dialog';

interface RunningManagementProps {
    event: Event;
    categories?: RunningEventCategory[];
    registrationCategories?: Pick<RegistrationCategory, 'id' | 'name'>[];
}

/**
 * The race module on the event page: one card per distance, each a way into
 * that distance's start list and results. Mirrors BasketballManagement, which
 * plays the same role for a tournament.
 */
export function RunningManagement({
    event,
    categories = [],
    registrationCategories = [],
}: RunningManagementProps) {
    const handleDeleteCategory = (category: RunningEventCategory) => {
        router.delete(
            `/dashboard/events/${event.id}/running-categories/${category.id}`,
            { preserveScroll: true },
        );
    };

    return (
        <section className="flex flex-col gap-5 rounded-xl border bg-card p-4 shadow-sm sm:gap-6 sm:p-6 md:p-8">
            {event.specific_type === 'RunningEvent' ? (
                <>
                    <h2 className="border-b pb-4 text-lg font-semibold tracking-tight sm:text-xl">
                        Race Management
                    </h2>

                    <div className="flex flex-col gap-4">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-2">
                            <div className="min-w-0">
                                <h3 className="font-medium">Distances</h3>
                                <p className="text-sm text-muted-foreground">
                                    Each distance has its own start time, bib
                                    range and results
                                </p>
                            </div>
                            <RunningCategoryFormDialog
                                event={event}
                                registrationCategories={registrationCategories}
                                trigger={
                                    <Button
                                        size="sm"
                                        className="w-full shrink-0 sm:w-auto"
                                    >
                                        <Plus className="mr-2 h-4 w-4" />
                                        Add Distance
                                    </Button>
                                }
                            />
                        </div>

                        {categories.length === 0 ? (
                            <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed py-10 text-center">
                                <Flag className="h-5 w-5 text-muted-foreground" />
                                <p className="text-sm font-medium">
                                    No distances yet
                                </p>
                                <p className="max-w-sm text-sm text-muted-foreground">
                                    Add the first distance to open sign-ups and
                                    start building a start list.
                                </p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                {categories.map((category) => (
                                    <div
                                        key={category.id}
                                        className="flex min-w-0 flex-col gap-2 rounded-lg border p-3 sm:p-4"
                                    >
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="flex min-w-0 items-center gap-2">
                                                <Timer className="h-4 w-4 shrink-0 text-primary" />
                                                <span className="min-w-0 truncate font-medium">
                                                    {category.name}
                                                </span>
                                            </div>
                                            <Badge
                                                variant="secondary"
                                                className="shrink-0"
                                            >
                                                {formatDistance(
                                                    category.distance_meters,
                                                )}
                                            </Badge>
                                        </div>

                                        <p className="text-sm text-muted-foreground">
                                            {category.participants_count ?? 0}{' '}
                                            runner(s) ·{' '}
                                            {category.finishers_count ?? 0}{' '}
                                            finisher(s)
                                            {category.quota
                                                ? ` · quota ${category.quota}`
                                                : ''}
                                        </p>

                                        {category.start_at && (
                                            <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                                                <Clock className="h-3.5 w-3.5" />
                                                {formatDateTime(
                                                    category.start_at,
                                                )}
                                                {category.cutoff_minutes
                                                    ? ` · cut-off ${category.cutoff_minutes} min`
                                                    : ''}
                                            </p>
                                        )}

                                        {category.price !== null && (
                                            <p className="text-sm text-muted-foreground">
                                                {formatRupiah(category.price)}
                                            </p>
                                        )}

                                        <div className="mt-1 flex flex-wrap items-center justify-between gap-1">
                                            <div className="flex items-center gap-1">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-7 px-2 text-xs"
                                                    asChild
                                                >
                                                    <Link
                                                        href={`/dashboard/events/${event.id}/running-categories/${category.id}/participants`}
                                                    >
                                                        <Users className="mr-1 h-3.5 w-3.5" />
                                                        Start list
                                                    </Link>
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-7 px-2 text-xs"
                                                    asChild
                                                >
                                                    <Link
                                                        href={`/dashboard/events/${event.id}/running-categories/${category.id}/results`}
                                                    >
                                                        <ListOrdered className="mr-1 h-3.5 w-3.5" />
                                                        Results
                                                    </Link>
                                                </Button>
                                            </div>
                                            <div className="ml-auto flex items-center gap-1">
                                                <RunningCategoryFormDialog
                                                    event={event}
                                                    category={category}
                                                    registrationCategories={
                                                        registrationCategories
                                                    }
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
                                                            This will
                                                            permanently delete{' '}
                                                            <span className="font-semibold">
                                                                {category.name}
                                                            </span>{' '}
                                                            along with its start
                                                            list and results.
                                                            Registrations are
                                                            not affected.
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
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </>
            ) : (
                <div className="flex flex-col items-center justify-center gap-4 py-8 text-center">
                    <div className="space-y-2">
                        <h3 className="text-lg font-medium">Race</h3>
                        <p className="text-sm text-muted-foreground">
                            This event has not been set up as a race yet.
                        </p>
                    </div>
                    <Button
                        onClick={() => router.post(`/events/${event.id}/running`)}
                    >
                        Set Up Race
                    </Button>
                </div>
            )}
        </section>
    );
}
