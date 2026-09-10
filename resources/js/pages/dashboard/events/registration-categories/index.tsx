import { Head, Link, router } from '@inertiajs/react';
import { ChevronLeft, Link2, Pencil, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { DeleteConfirmationDialog } from '@/components/delete-confirmation-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatRupiah } from '@/lib/format-currency';
import type { Event } from '@/types/event';
import type { RegistrationCategory } from '@/types/registration-category';

interface Props {
    event: Event;
    registrationCategories: RegistrationCategory[];
}

export default function RegistrationCategoriesIndex({
    event,
    registrationCategories,
}: Props) {
    function handleDelete(id: number) {
        router.delete(
            `/dashboard/events/${event.id}/registration-categories/${id}`,
            { preserveScroll: true },
        );
    }

    function handleCopyLink(category: RegistrationCategory) {
        const url = `${window.location.origin}/events/${event.id}/registration-categories/${category.id}/register`;
        navigator.clipboard.writeText(url);
        toast.success('Registration link copied to clipboard');
    }

    return (
        <div className="mx-auto flex h-full w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-6 md:px-8 md:py-8">
            <Head title={`Registration Categories · ${event.name}`} />

            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-4">
                    <Button
                        variant="outline"
                        size="icon"
                        className="h-10 w-10 shrink-0"
                        asChild
                    >
                        <Link
                            href={`/dashboard/events/${event.id}`}
                            aria-label="Back to event"
                        >
                            <ChevronLeft className="h-5 w-5" />
                        </Link>
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">
                            Registration Categories
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            {event.name} · Define who can register, what it
                            costs, and the questions they answer.
                        </p>
                    </div>
                </div>

                <Button asChild>
                    <Link
                        href={`/dashboard/events/${event.id}/registration-categories/builder`}
                    >
                        <Plus className="mr-2 h-4 w-4" />
                        Add Category
                    </Link>
                </Button>
            </div>

            <div className="divide-y rounded-lg border">
                {registrationCategories.length === 0 && (
                    <p className="px-4 py-8 text-center text-sm text-muted-foreground">
                        No registration categories yet. Add one to start
                        collecting registrations for this event.
                    </p>
                )}

                {registrationCategories.map((category) => (
                    <div
                        key={category.id}
                        className="flex flex-col gap-2 px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-4"
                    >
                        <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                                <p className="text-sm font-medium">
                                    {category.name}
                                </p>
                                <Badge variant="outline" className="capitalize">
                                    {category.subject_type}
                                </Badge>
                                {!category.registration_open && (
                                    <Badge variant="outline">Closed</Badge>
                                )}
                            </div>
                            <p className="text-xs text-muted-foreground">
                                {formatRupiah(category.price)}
                                {' · '}
                                {category.registered_count}
                                {category.quota
                                    ? ` / ${category.quota}`
                                    : ''}{' '}
                                registered
                                {' · '}
                                {(category.form_pages ?? []).reduce(
                                    (count, page) => count + page.fields.length,
                                    0,
                                )}{' '}
                                custom field(s)
                            </p>
                        </div>

                        <div className="flex shrink-0 items-center justify-between gap-2 sm:justify-start">
                            <Link
                                href={`/dashboard/events/${event.id}/registration-categories/${category.id}`}
                                className="text-xs whitespace-nowrap text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
                            >
                                {category.registrations_count ?? 0}{' '}
                                registration(s)
                            </Link>

                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleCopyLink(category)}
                                aria-label="Copy registration link"
                            >
                                <Link2 className="h-4 w-4" />
                            </Button>

                            <Button variant="ghost" size="icon" asChild>
                                <Link
                                    href={`/dashboard/events/${event.id}/registration-categories/builder?registration_category_id=${category.id}`}
                                >
                                    <Pencil className="h-4 w-4" />
                                </Link>
                            </Button>

                            <DeleteConfirmationDialog
                                title="Delete registration category?"
                                description={
                                    (category.registrations_count ?? 0) > 0
                                        ? 'This category already has registrations and cannot be deleted.'
                                        : undefined
                                }
                                confirmationValue={category.slug}
                                onConfirm={() => handleDelete(category.id)}
                                trigger={
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="text-muted-foreground hover:text-destructive"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                }
                            />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
