import { zodResolver } from '@hookform/resolvers/zod';
import { router } from '@inertiajs/react';
import { useState } from 'react';
import type { ReactNode } from 'react';
import { Controller, useForm } from 'react-hook-form';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import type { AttendeeType } from '@/types/attendee-type';
import type { Event } from '@/types/event';

const typeSchema = z.object({
    key: z
        .string()
        .min(1, 'Input a key')
        .max(100)
        .regex(/^[a-z0-9_-]+$/, 'Lowercase letters, numbers, dashes and underscores only'),
    label: z.string().min(1, 'Input a label').max(255),
    icon: z.string().max(100).or(z.literal('')),
    color: z.string().max(20).or(z.literal('')),
    is_active: z.boolean(),
});

type TypeFormValues = z.infer<typeof typeSchema>;

function toDefaultValues(type?: AttendeeType): TypeFormValues {
    return {
        key: type?.key ?? '',
        label: type?.label ?? '',
        icon: type?.icon ?? '',
        color: type?.color ?? '#0ea5e9',
        is_active: type?.is_active ?? true,
    };
}

interface AttendeeTypeFormDialogProps {
    event: Event;
    attendeeType?: AttendeeType;
    trigger: ReactNode;
}

export function AttendeeTypeFormDialog({ event, attendeeType, trigger }: AttendeeTypeFormDialogProps) {
    const isEditing = Boolean(attendeeType);
    const [open, setOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    const { control, handleSubmit, reset } = useForm<TypeFormValues>({
        resolver: zodResolver(typeSchema),
        defaultValues: toDefaultValues(attendeeType),
        mode: 'onChange',
    });

    const onSubmit = (data: TypeFormValues) => {
        const options = {
            preserveScroll: true,
            onStart: () => setIsSaving(true),
            onFinish: () => setIsSaving(false),
            onSuccess: () => {
                setOpen(false);
                reset();
            },
        };

        if (isEditing && attendeeType) {
            router.put(`/dashboard/events/${event.id}/attendee-types/${attendeeType.id}`, data, options);
        } else {
            router.post(`/dashboard/events/${event.id}/attendee-types`, data, options);
        }
    };

    return (
        <Dialog
            open={open}
            onOpenChange={(next) => {
                setOpen(next);

                if (!next) {
                    reset(toDefaultValues(attendeeType));
                }
            }}
        >
            <DialogTrigger asChild>{trigger}</DialogTrigger>
            <DialogContent>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    <DialogHeader>
                        <DialogTitle>{isEditing ? 'Edit Attendee Type' : 'Add Attendee Type'}</DialogTitle>
                        <DialogDescription>
                            Attendee types (guest, tenant, photographer, or any custom type you add) can each be issued their own ID card.
                        </DialogDescription>
                    </DialogHeader>

                    <FieldGroup className="py-2">
                        <Controller
                            name="label"
                            control={control}
                            render={({ field, fieldState }) => (
                                <Field data-invalid={fieldState.invalid}>
                                    <FieldLabel htmlFor="label">Label</FieldLabel>
                                    <Input id="label" {...field} />
                                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                                </Field>
                            )}
                        />

                        <Controller
                            name="key"
                            control={control}
                            render={({ field, fieldState }) => (
                                <Field data-invalid={fieldState.invalid}>
                                    <FieldLabel htmlFor="key">
                                        Key <span className="font-normal text-muted-foreground">(used internally, cannot be changed later)</span>
                                    </FieldLabel>
                                    <Input id="key" {...field} disabled={isEditing} />
                                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                                </Field>
                            )}
                        />

                        <div className="grid grid-cols-2 gap-4">
                            <Controller
                                name="color"
                                control={control}
                                render={({ field, fieldState }) => (
                                    <Field data-invalid={fieldState.invalid}>
                                        <FieldLabel htmlFor="color">Color</FieldLabel>
                                        <Input id="color" type="color" {...field} />
                                        {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                                    </Field>
                                )}
                            />
                            <Controller
                                name="icon"
                                control={control}
                                render={({ field, fieldState }) => (
                                    <Field data-invalid={fieldState.invalid}>
                                        <FieldLabel htmlFor="icon">
                                            Icon <span className="font-normal text-muted-foreground">(lucide name)</span>
                                        </FieldLabel>
                                        <Input id="icon" placeholder="UserRound" {...field} />
                                        {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                                    </Field>
                                )}
                            />
                        </div>

                        <Controller
                            name="is_active"
                            control={control}
                            render={({ field }) => (
                                <Field orientation="horizontal">
                                    <Checkbox id="is_active" checked={field.value} onCheckedChange={(checked) => field.onChange(Boolean(checked))} />
                                    <FieldLabel htmlFor="is_active" className="font-normal">
                                        Active (available when adding attendees)
                                    </FieldLabel>
                                </Field>
                            )}
                        />
                    </FieldGroup>

                    <DialogFooter>
                        <Button type="submit" disabled={isSaving}>
                            {isSaving ? 'Saving…' : isEditing ? 'Save changes' : 'Add type'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
