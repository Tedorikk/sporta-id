import { zodResolver } from '@hookform/resolvers/zod';
import { router } from '@inertiajs/react';
import { useState } from 'react';
import type { ReactNode } from 'react';
import { Controller, useForm } from 'react-hook-form';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import {
    Field,
    FieldError,
    FieldGroup,
    FieldLabel,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { UploadImage } from '@/components/upload-image';
import type { Attendee, AttendeeStatus } from '@/types/attendee';
import { ATTENDEE_STATUSES } from '@/types/attendee';
import type { AttendeeType } from '@/types/attendee-type';
import type { Event } from '@/types/event';

const attendeeSchema = z.object({
    name: z.string().min(1, 'Input attendee name').max(255),
    attendee_type_id: z.string().min(1, 'Please select a type'),
    photo: z.string().url('Must be a valid URL').or(z.literal('')),
    organization: z.string().max(255).or(z.literal('')),
    title: z.string().max(255).or(z.literal('')),
    email: z.string().email('Must be a valid email').or(z.literal('')),
    phone: z.string().max(50).or(z.literal('')),
    status: z.enum(['active', 'revoked']),
    notes: z.string().max(2000).or(z.literal('')),
});

type AttendeeFormValues = z.infer<typeof attendeeSchema>;

function toDefaultValues(attendee?: Attendee): AttendeeFormValues {
    return {
        name: attendee?.name ?? '',
        attendee_type_id: attendee?.attendee_type_id?.toString() ?? '',
        photo: attendee?.photo ?? '',
        organization: attendee?.organization ?? '',
        title: attendee?.title ?? '',
        email: attendee?.email ?? '',
        phone: attendee?.phone ?? '',
        status: (attendee?.status as AttendeeStatus) ?? 'active',
        notes: attendee?.notes ?? '',
    };
}

interface AttendeeFormDialogProps {
    event: Event;
    attendee?: Attendee;
    attendeeTypes: AttendeeType[];
    trigger: ReactNode;
}

export function AttendeeFormDialog({
    event,
    attendee,
    attendeeTypes,
    trigger,
}: AttendeeFormDialogProps) {
    const isEditing = Boolean(attendee);
    const [open, setOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    const { control, handleSubmit, reset, setError, clearErrors } =
        useForm<AttendeeFormValues>({
            resolver: zodResolver(attendeeSchema),
            defaultValues: toDefaultValues(attendee),
            mode: 'onChange',
        });

    const onSubmit = (data: AttendeeFormValues) => {
        const options = {
            preserveScroll: true,
            onStart: () => setIsSaving(true),
            onFinish: () => setIsSaving(false),
            onSuccess: () => {
                setOpen(false);
                reset();
            },
        };

        if (isEditing && attendee) {
            router.put(
                `/dashboard/events/${event.id}/attendees/${attendee.id}`,
                data,
                options,
            );
        } else {
            router.post(
                `/dashboard/events/${event.id}/attendees`,
                data,
                options,
            );
        }
    };

    return (
        <Dialog
            open={open}
            onOpenChange={(next) => {
                setOpen(next);

                if (!next) {
                    reset(toDefaultValues(attendee));
                }
            }}
        >
            <DialogTrigger asChild>{trigger}</DialogTrigger>
            <DialogContent className="max-h-[80vh] overflow-y-auto">
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    <DialogHeader>
                        <DialogTitle>
                            {isEditing ? 'Edit Attendee' : 'Add Attendee'}
                        </DialogTitle>
                        <DialogDescription>
                            {isEditing
                                ? `Update this attendee's ID card details.`
                                : `Issue an ID card to a guest, tenant, photographer, or other attendee.`}
                        </DialogDescription>
                    </DialogHeader>

                    <FieldGroup className="py-4">
                        <Controller
                            name="photo"
                            control={control}
                            render={({ field, fieldState }) => (
                                <Field data-invalid={fieldState.invalid}>
                                    <FieldLabel htmlFor="photo">
                                        Photo{' '}
                                        <span className="font-normal text-muted-foreground">
                                            (Optional)
                                        </span>
                                    </FieldLabel>
                                    <UploadImage
                                        {...field}
                                        ratio={4 / 5}
                                        value={field.value}
                                        onChange={(value) => {
                                            clearErrors('photo');
                                            field.onChange(value ?? '');
                                        }}
                                        onError={(error) => {
                                            setError('photo', {
                                                type: 'manual',
                                                message:
                                                    typeof error === 'string'
                                                        ? error
                                                        : 'Upload failed',
                                            });
                                        }}
                                        enableCrop
                                    />
                                    {fieldState.invalid && (
                                        <FieldError
                                            errors={[fieldState.error]}
                                        />
                                    )}
                                </Field>
                            )}
                        />

                        <Controller
                            name="name"
                            control={control}
                            render={({ field, fieldState }) => (
                                <Field data-invalid={fieldState.invalid}>
                                    <FieldLabel htmlFor="name">Name</FieldLabel>
                                    <Input id="name" {...field} />
                                    {fieldState.invalid && (
                                        <FieldError
                                            errors={[fieldState.error]}
                                        />
                                    )}
                                </Field>
                            )}
                        />

                        <Controller
                            name="attendee_type_id"
                            control={control}
                            render={({ field, fieldState }) => (
                                <Field data-invalid={fieldState.invalid}>
                                    <FieldLabel htmlFor="attendee_type_id">
                                        Type
                                    </FieldLabel>
                                    <Select
                                        value={field.value}
                                        onValueChange={field.onChange}
                                    >
                                        <SelectTrigger id="attendee_type_id">
                                            <SelectValue placeholder="Select a type" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {attendeeTypes.map((type) => (
                                                <SelectItem
                                                    key={type.id}
                                                    value={type.id.toString()}
                                                >
                                                    {type.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    {fieldState.invalid && (
                                        <FieldError
                                            errors={[fieldState.error]}
                                        />
                                    )}
                                </Field>
                            )}
                        />

                        <div className="grid grid-cols-2 gap-4">
                            <Controller
                                name="organization"
                                control={control}
                                render={({ field, fieldState }) => (
                                    <Field data-invalid={fieldState.invalid}>
                                        <FieldLabel htmlFor="organization">
                                            Organization / Company
                                        </FieldLabel>
                                        <Input id="organization" {...field} />
                                        {fieldState.invalid && (
                                            <FieldError
                                                errors={[fieldState.error]}
                                            />
                                        )}
                                    </Field>
                                )}
                            />
                            <Controller
                                name="title"
                                control={control}
                                render={({ field, fieldState }) => (
                                    <Field data-invalid={fieldState.invalid}>
                                        <FieldLabel htmlFor="title">
                                            Title / Booth / Credential
                                        </FieldLabel>
                                        <Input id="title" {...field} />
                                        {fieldState.invalid && (
                                            <FieldError
                                                errors={[fieldState.error]}
                                            />
                                        )}
                                    </Field>
                                )}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <Controller
                                name="email"
                                control={control}
                                render={({ field, fieldState }) => (
                                    <Field data-invalid={fieldState.invalid}>
                                        <FieldLabel htmlFor="email">
                                            Email
                                        </FieldLabel>
                                        <Input
                                            id="email"
                                            type="email"
                                            {...field}
                                        />
                                        {fieldState.invalid && (
                                            <FieldError
                                                errors={[fieldState.error]}
                                            />
                                        )}
                                    </Field>
                                )}
                            />
                            <Controller
                                name="phone"
                                control={control}
                                render={({ field, fieldState }) => (
                                    <Field data-invalid={fieldState.invalid}>
                                        <FieldLabel htmlFor="phone">
                                            Phone
                                        </FieldLabel>
                                        <Input id="phone" {...field} />
                                        {fieldState.invalid && (
                                            <FieldError
                                                errors={[fieldState.error]}
                                            />
                                        )}
                                    </Field>
                                )}
                            />
                        </div>

                        {isEditing && (
                            <Controller
                                name="status"
                                control={control}
                                render={({ field, fieldState }) => (
                                    <Field data-invalid={fieldState.invalid}>
                                        <FieldLabel htmlFor="status">
                                            Status
                                        </FieldLabel>
                                        <Select
                                            value={field.value}
                                            onValueChange={field.onChange}
                                        >
                                            <SelectTrigger id="status">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {ATTENDEE_STATUSES.map((s) => (
                                                    <SelectItem
                                                        key={s.value}
                                                        value={s.value}
                                                    >
                                                        {s.label}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        {fieldState.invalid && (
                                            <FieldError
                                                errors={[fieldState.error]}
                                            />
                                        )}
                                    </Field>
                                )}
                            />
                        )}

                        <Controller
                            name="notes"
                            control={control}
                            render={({ field, fieldState }) => (
                                <Field data-invalid={fieldState.invalid}>
                                    <FieldLabel htmlFor="notes">
                                        Notes{' '}
                                        <span className="font-normal text-muted-foreground">
                                            (Optional)
                                        </span>
                                    </FieldLabel>
                                    <Textarea id="notes" rows={2} {...field} />
                                    {fieldState.invalid && (
                                        <FieldError
                                            errors={[fieldState.error]}
                                        />
                                    )}
                                </Field>
                            )}
                        />
                    </FieldGroup>

                    <DialogFooter>
                        <Button type="submit" disabled={isSaving}>
                            {isSaving
                                ? 'Saving…'
                                : isEditing
                                  ? 'Save changes'
                                  : 'Add attendee'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
