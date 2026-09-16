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
    FieldDescription,
    FieldError,
    FieldGroup,
    FieldLabel,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import type { Event } from '@/types/event';
import type { RunningEventCategory } from '@/types/running-event-category';

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
    start_at: z.string(),
    cutoff_minutes: z.string(),
    bib_prefix: z.string().max(10),
    bib_start_number: z
        .string()
        .refine(
            (value) => Number.isInteger(Number(value)) && Number(value) >= 1,
            'Start from 1 or higher',
        ),
    bib_start_male: z.string(),
    bib_start_female: z.string(),
    minimum_age: z.string(),
});

type DistanceFormValues = z.infer<typeof distanceSchema>;

function toDefaultValues(category?: RunningEventCategory): DistanceFormValues {
    return {
        name: category?.name ?? '',
        distance_meters: String(category?.distance_meters ?? 5000),
        // datetime-local wants "YYYY-MM-DDTHH:mm"; the API sends ISO.
        start_at: category?.start_at ? category.start_at.slice(0, 16) : '',
        cutoff_minutes: category?.cutoff_minutes
            ? String(category.cutoff_minutes)
            : '',
        bib_prefix: category?.bib_prefix ?? '',
        bib_start_number: String(category?.bib_start_number ?? 1),
        bib_start_male: category?.bib_start_male
            ? String(category.bib_start_male)
            : '',
        bib_start_female: category?.bib_start_female
            ? String(category.bib_start_female)
            : '',
        minimum_age: category?.minimum_age
            ? String(category.minimum_age)
            : '',
    };
}

interface RunningCategoryFormDialogProps {
    event: Event;
    category?: RunningEventCategory;
    trigger: ReactNode;
}

export function RunningCategoryFormDialog({
    event,
    category,
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
            start_at: data.start_at || null,
            cutoff_minutes: data.cutoff_minutes
                ? Number(data.cutoff_minutes)
                : null,
            bib_prefix: data.bib_prefix || null,
            bib_start_number: Number(data.bib_start_number),
            bib_start_male: data.bib_start_male
                ? Number(data.bib_start_male)
                : null,
            bib_start_female: data.bib_start_female
                ? Number(data.bib_start_female)
                : null,
            minimum_age: data.minimum_age ? Number(data.minimum_age) : null,
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
                            range and results. Its sign-up forms (price,
                            quota, with/without jersey) live under
                            Registration Categories.
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
                                name="bib_start_male"
                                control={control}
                                render={({ field }) => (
                                    <Field>
                                        <FieldLabel htmlFor="bib_start_male">
                                            First bib — men
                                            <span className="font-normal text-muted-foreground">
                                                {' '}
                                                (Optional)
                                            </span>
                                        </FieldLabel>
                                        <Input
                                            {...field}
                                            id="bib_start_male"
                                            type="number"
                                            min={1}
                                            placeholder="Same as first bib"
                                        />
                                    </Field>
                                )}
                            />

                            <Controller
                                name="bib_start_female"
                                control={control}
                                render={({ field }) => (
                                    <Field>
                                        <FieldLabel htmlFor="bib_start_female">
                                            First bib — women
                                            <span className="font-normal text-muted-foreground">
                                                {' '}
                                                (Optional)
                                            </span>
                                        </FieldLabel>
                                        <Input
                                            {...field}
                                            id="bib_start_female"
                                            type="number"
                                            min={1}
                                            placeholder="e.g. 3000"
                                        />
                                    </Field>
                                )}
                            />
                        </div>
                        <FieldDescription className="-mt-2">
                            Leave both blank to number every runner in one
                            sequence from the first bib above. Set either to
                            give men and women independent ranges.
                        </FieldDescription>

                        <Controller
                            name="minimum_age"
                            control={control}
                            render={({ field }) => (
                                <Field>
                                    <FieldLabel htmlFor="minimum_age">
                                        Minimum age
                                        <span className="font-normal text-muted-foreground">
                                            {' '}
                                            (Optional)
                                        </span>
                                    </FieldLabel>
                                    <Input
                                        {...field}
                                        id="minimum_age"
                                        type="number"
                                        min={1}
                                        max={120}
                                        placeholder="No minimum"
                                    />
                                    <FieldDescription>
                                        Checked against the runner's date of
                                        birth on race day, at sign-up.
                                    </FieldDescription>
                                </Field>
                            )}
                        />
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
