import { Head, router } from '@inertiajs/react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { DeleteConfirmationDialog } from '@/components/delete-confirmation-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { AttendeeType } from '@/types/attendee-type';
import { AttendeeTypeFormDialog } from './components/attendee-type-form-dialog';

interface Props {
    attendeeTypes: (AttendeeType & { attendees_count: number })[];
}

export default function AttendeeTypesIndex({ attendeeTypes }: Props) {
    function handleDelete(id: number) {
        router.delete(`/dashboard/attendee-types/${id}`, { preserveScroll: true });
    }

    return (
        <div className="mx-auto flex h-full w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-6 md:px-8 md:py-8">
            <Head title="Attendee Types" />

            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Attendee Types</h1>
                    <p className="text-sm text-muted-foreground">
                        Guest, Tenant, and Photographer ship by default — add more types here any time an event needs a new kind of ID card.
                    </p>
                </div>

                <AttendeeTypeFormDialog
                    trigger={
                        <Button>
                            <Plus className="mr-2 h-4 w-4" />
                            Add Type
                        </Button>
                    }
                />
            </div>

            <div className="divide-y rounded-lg border">
                {attendeeTypes.map((type) => (
                    <div key={type.id} className="flex items-center justify-between gap-4 px-4 py-3">
                        <div className="flex items-center gap-3">
                            <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: type.color ?? '#94a3b8' }} />
                            <div>
                                <p className="text-sm font-medium">{type.label}</p>
                                <p className="text-xs text-muted-foreground">{type.key}</p>
                            </div>
                            {!type.is_active && <Badge variant="outline">Inactive</Badge>}
                        </div>

                        <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">{type.attendees_count} attendee(s)</span>

                            <AttendeeTypeFormDialog
                                attendeeType={type}
                                trigger={
                                    <Button variant="ghost" size="icon">
                                        <Pencil className="h-4 w-4" />
                                    </Button>
                                }
                            />

                            <DeleteConfirmationDialog
                                title="Delete attendee type?"
                                description={
                                    type.attendees_count > 0
                                        ? 'This type still has attendees assigned to it and cannot be deleted until they are removed or reassigned.'
                                        : undefined
                                }
                                confirmationValue={type.key}
                                onConfirm={() => handleDelete(type.id)}
                                trigger={
                                    <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive">
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
