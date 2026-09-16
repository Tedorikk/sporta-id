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
import type { Event } from '@/types/event';
import type { RegistrationCategory } from '@/types/registration-category';
import type { RunningEventCategory } from '@/types/running-event-category';

/** The sentinel the Select uses for "no sign-up form" — Radix forbids "". */
const NO_REGISTRATION_CATEGORY = 'none';

/**
 * Every field is held as a string — what an <input> actually gives back — and
 * converted once on submit, so the form's own type never fights the DOM's.
 */
const distanceSchema = z.object({
    name: z.string().min(1, 'Input a name').max(255),
    distance_meters: z
        .string()
        .refine(
            (value) => Number.isInteger(Number(value)) && Number(value) >= 1,
            'Input a distance in whole metres',
        ),
    registration_category_id: z.string(),
    start_at: z.string(),
    cutoff_minutes: z.string(),
    bib_prefix: z.string().max(10),
    bib_start_number: z
        .string()
        .refine(
            (value) => Number.isInteger(Number(value)) && Number(value) >= 1,
            'Start from 1 or higher',
        ),
    quota: z.string(),
    price: z.string(),
});

type DistanceFormValues = z.infer<typeof distanceSchema>;

function toDefaultValues(category?: RunningEventCategory): DistanceFormValues {
    return {
        name: category?.name ?? '',
        distance_meters: String(category?.distance_meters ?? 5000),
        registration_category_id: category?.registration_category_id
            ? String(category.registration_category_id)
            : NO_REGISTRATION_CATEGORY,
        // datetime-local wants "YYYY-MM-DDTHH:mm"; the API sends ISO.
        start_at: category?.start_at ? category.start_at.slice(0, 16) : '',
        cutoff_minutes: category?.cutoff_minutes
            ? String(category.cutoff_minutes)
            : '',
        bib_prefix: category?.bib_prefix ?? '',
        bib_start_number: String(category?.bib_start_number ?? 1),
        quota: category?.quota ? String(category.quota) : '',
        price: category?.price ? String(category.price) : '',
    };
}

interface RunningCategoryFormDialogProps {
    event: Event;
    category?: RunningEventCategory;
    registrationCategories: Pick<RegistrationCategory, 'id' | 'name'>[];
    trigger: ReactNode;
}

export function RunningCategoryFormDialog({
    event,
    category,
    registrationCategories,
    trigger,
}: RunningCategoryFormDialogProps) {
    const isEditing = Boolean(category);
    const [open, setOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    const { control, handleSubmit, reset } = useForm<DistanceFormValues>({
        resolver: zodResolver(distanceSchema),
        defaultValues: toDefaultValues(category),
        mode: 'onChange',
    });

    const onSubmit = (data: DistanceFormValues) => {
        const payload = {
            name: data.name,
            distance_meters: Number(data.distance_meters),
            registration_category_id:
                data.registration_category_id === NO_REGISTRATION_CATEGORY
                    ? null
                    : Number(data.registration_category_id),
            start_at: data.start_at || null,
            cutoff_minutes: data.cutoff_minutes
                ? Number(data.cutoff_minutes)
                : null,
            bib_prefix: data.bib_prefix || null,
            bib_start_number: Number(data.bib_start_number),
            quota: data.quota ? Number(data.quota) : null,
            price: data.price ? Number(data.price) : null,
            status: category?.status ?? 'active',
        };

        const options = {
            preserveScroll: true,
            onStart: () => setIsSaving(true),
            onFinish: () => setIsSaving(false),
            onSuccess: () => {
                setOpen(false);
                reset(toDefaultValues(category));
            },
        };

        const base = `/dashboard/events/${event.id}/running-categories`;

        if (isEditing && category) {
            router.put(`${base}/${category.id}`, payload, options);
        } else {
            router.post(base, payload, options);
        }
    };

    return (
        <Dialog
            open={open}
            onOpenChange={(next) => {
                setOpen(next);

                if (!next) {
                    reset(toDefaultValues(category));
                }
            }}
        >
            <DialogTrigger asChild>{trigger}</DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto">
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    <DialogHeader>
                        <DialogTitle>
                            {isEditing ? 'Edit Distance' : 'Add Distance'}
                        </DialogTitle>
                        <DialogDescription>
                            A distance is one race within the event — a 5K, a
                            10K, a half marathon — with its own start time, bib
                            range and results.
                        </DialogDescription>
                    </DialogHeader>

                    <FieldGroup className="py-2">
                        <Controller
                            name="name"
                            control={control}
                            render={({ field, fieldState }) => (
                                <Field data-invalid={fieldState.invalid}>
                                    <FieldLabel htmlFor="name">Name</FieldLabel>
                                    <Input
                                        {...field}
                                        id="name"
                                        placeholder="Half Marathon"
                                        aria-invalid={fieldState.invalid}
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
                            name="distance_meters"
                            control={control}
                            render={({ field, fieldState }) => (
                                <Field data-invalid={fieldState.invalid}>
                                    <FieldLabel htmlFor="distance_meters">
                                        Distance (metres)
                                    </FieldLabel>
                                    <Input
                                        {...field}
                                        id="distance_meters"
                                        type="number"
                                        min={1}
                                        placeholder="21097"
                                        aria-invalid={fieldState.invalid}
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
                            name="registration_category_id"
                            control={control}
                            render={({ field }) => (
                                <Field>
                                    <FieldLabel htmlFor="registration_category_id">
                                        Sign-up form
                                    </FieldLabel>
                                    <Select
                                        value={field.value}
                                        onValueChange={field.onChange}
                                    >
                                        <SelectTrigger
                                            id="registration_category_id"
                                            className="w-full cursor-pointer"
                                        >
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem
                                                value={NO_REGISTRATION_CATEGORY}
                                                className="cursor-pointer"
                                            >
                                                None — walk-ins only
                                            </SelectItem>
                                            {registrationCategories.map(
                                                (registrationCategory) => (
                                                    <SelectItem
                                                        key={
                                                            registrationCategory.id
                                                        }
                                                        value={String(
                                                            registrationCategory.id,
                                                        )}
                                                        className="cursor-pointer"
                                                    >
                                                        {
                                                            registrationCategory.name
                                                        }
                                                    </SelectItem>
                                                ),
                                            )}
                                        </SelectContent>
                                    </Select>
                                </Field>
                            )}
                        />

                        <Controller
                            name="start_at"
                            control={control}
                            render={({ field }) => (
                                <Field>
                                    <FieldLabel htmlFor="start_at">
                                        Start time
                                    </FieldLabel>
                                    <Input
                                        {...field}
                                        id="start_at"
                                        type="datetime-local"
                                    />
                                </Field>
                            )}
                        />

                        <Controller
                            name="cutoff_minutes"
                            control={control}
                            render={({ field }) => (
                                <Field>
                                    <FieldLabel htmlFor="cutoff_minutes">
                                        Cut-off (minutes)
                                    </FieldLabel>
                                    <Input
                                        {...field}
                                        id="cutoff_minutes"
                                        type="number"
                                        min={1}
                                        placeholder="210"
                                    />
                                </Field>
                            )}
                        />

                        <div className="grid grid-cols-2 gap-4">
                            <Controller
                                name="bib_prefix"
                                control={control}
                                render={({ field }) => (
                                    <Field>
                                        <FieldLabel htmlFor="bib_prefix">
                                            Bib prefix
                                        </FieldLabel>
                                        <Input
                                            {...field}
                                            id="bib_prefix"
                                            placeholder="A"
                                        />
                                    </Field>
                                )}
                            />

                            <Controller
                                name="bib_start_number"
                                control={control}
                                render={({ field, fieldState }) => (
                                    <Field data-invalid={fieldState.invalid}>
                                        <FieldLabel htmlFor="bib_start_number">
                                            First bib
                                        </FieldLabel>
                                        <Input
                                            {...field}
                                            id="bib_start_number"
                                            type="number"
                                            min={1}
                                            aria-invalid={fieldState.invalid}
                                        />
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
                                name="price"
                                control={control}
                                render={({ field }) => (
                                    <Field>
                                        <FieldLabel htmlFor="price">
                                            Price (Rp)
                                        </FieldLabel>
                                        <Input
                                            {...field}
                                            id="price"
                                            type="number"
                                            min={0}
                                            placeholder="150000"
                                        />
                                    </Field>
                                )}
                            />

                            <Controller
                                name="quota"
                                control={control}
                                render={({ field }) => (
                                    <Field>
                                        <FieldLabel htmlFor="quota">
                                            Quota
                                        </FieldLabel>
                                        <Input
                                            {...field}
                                            id="quota"
                                            type="number"
                                            min={1}
                                            placeholder="500"
                                        />
                                    </Field>
                                )}
                            />
                        </div>
                    </FieldGroup>

                    <DialogFooter>
                        <Button type="submit" disabled={isSaving}>
                            {isSaving ? 'Saving…' : 'Save'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
