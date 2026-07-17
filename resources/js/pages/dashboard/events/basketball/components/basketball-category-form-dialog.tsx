import { zodResolver } from '@hookform/resolvers/zod';
import { router } from '@inertiajs/react';
import { Loader2 } from 'lucide-react';
import { useState  } from 'react';
import type {ReactNode} from 'react';
import { useForm, Controller, useWatch } from 'react-hook-form';
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
import type { BasketballEventCategory } from '@/types/basketball-event-category';
import type { Event } from '@/types/event';

const CATEGORY_STATUSES = [
    { value: 'PENDING', label: 'Pending' },
    { value: 'OPEN', label: 'Open' },
    { value: 'CLOSED', label: 'Closed' },
];

const digitsOnly = /^\d+$/;

// Required integer typed as a string field, transformed to a number after
// validation. Keeping the *input* type as `string` (not `number` or a
// union) is what keeps react-hook-form's `field.value` assignable to an
// <input>'s `value` prop.
function requiredIntField(min: number, minMessage: string) {
    return z
        .string()
        .min(1, 'Required')
        .refine((v) => digitsOnly.test(v), 'Must be a number')
        .transform((v) => Number(v))
        .refine((v) => v >= min, minMessage);
}

// Optional integer: empty string -> null, otherwise a validated number.
function optionalIntField(min?: number) {
    return z
        .string()
        .refine((v) => v === '' || digitsOnly.test(v), 'Must be a number')
        .transform((v) => (v === '' ? null : Number(v)))
        .refine(
            (v) => v === null || min === undefined || v >= min,
            min !== undefined ? `Minimum ${min}` : undefined,
        );
}

// Optional decimal (for price): empty string -> null, otherwise a number.
function optionalDecimalField() {
    return z
        .string()
        .refine(
            (v) => v === '' || !Number.isNaN(Number(v)),
            'Must be a number',
        )
        .transform((v) => (v === '' ? null : Number(v)))
        .refine((v) => v === null || v >= 0, 'Cannot be negative');
}

const CATEGORY_FORMATS = [
    {
        value: 'pool_stage',
        label: 'Pool Stage → Knockout',
        description:
            'Teams are divided into pools before entering an elimination bracket.',
    },
    {
        value: 'round_robin',
        label: 'Round Robin',
        description:
            'Every team plays every other team. No pools are created.',
    },
];

const categorySchema = z
    .object({
        name: z.string().min(1, 'Category name is required').max(255),
        min_team: requiredIntField(2, 'Minimum 2 teams'),
        max_team: optionalIntField(2),
        min_player_per_team: requiredIntField(1, 'Minimum 1 player'),
        max_player_per_team: optionalIntField(1),
        max_player_per_coach: optionalIntField(1),
        price: optionalDecimalField(),
        quota: optionalIntField(1),
        status: z.string().min(1),
        format: z.enum([
            'pool_stage',
            'round_robin'
        ])
    })
    .refine(
        (data) => data.max_team === null || data.max_team >= data.min_team,
        {
            message: 'Max teams must be ≥ min teams',
            path: ['max_team'],
        },
    )
    .refine(
        (data) =>
            data.max_player_per_team === null ||
            data.max_player_per_team >= data.min_player_per_team,
        {
            message: 'Max players must be ≥ min players',
            path: ['max_player_per_team'],
        },
    );

// Input type: what the form fields hold (all plain strings, matching
// what an <input> actually produces). Output type: what gets submitted,
// after Zod's transforms turn the numeric strings into numbers/null.
type CategoryFormInput = z.input<typeof categorySchema>;
type CategoryFormOutput = z.output<typeof categorySchema>;

function toDefaultValues(category?: BasketballEventCategory): CategoryFormInput {
    return {
        name: category?.name ?? '',
        min_team: String(category?.min_team ?? 2),
        max_team: category?.max_team != null ? String(category.max_team) : '',
        min_player_per_team: String(category?.min_player_per_team ?? 5),
        max_player_per_team:
            category?.max_player_per_team != null
                ? String(category.max_player_per_team)
                : '',
        max_player_per_coach:
            category?.max_player_per_coach != null
                ? String(category.max_player_per_coach)
                : '',
        price: category?.price != null ? String(category.price) : '',
        quota: category?.quota != null ? String(category.quota) : '',
        status: category?.status ?? 'PENDING',
        format: category?.format ? (category.format as 'pool_stage' | 'round_robin') : 'pool_stage'
    };
}

type BasketballCategoryFormDialogProps = {
    event: Event;
    category?: BasketballEventCategory;
    trigger: ReactNode;
};

export function BasketballCategoryFormDialog({
    event,
    category,
    trigger,
}: BasketballCategoryFormDialogProps) {
    const isEditing = Boolean(category);
    const [open, setOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    const { control, handleSubmit, reset } = useForm<
        CategoryFormInput,
        unknown,
        CategoryFormOutput
    >({
        resolver: zodResolver(categorySchema),
        defaultValues: toDefaultValues(category),
        mode: 'onChange',
    });

    const format = useWatch({
        control,
        name: 'format',
    });

    const onSubmit = (data: CategoryFormOutput) => {
        const options = {
            preserveScroll: true,
            onStart: () => setIsSaving(true),
            onFinish: () => setIsSaving(false),
            onSuccess: () => {
                setOpen(false);

                if (!isEditing) {
reset(toDefaultValues());
}
            },
        };

        if (isEditing && category) {
            router.put(
                `/dashboard/events/${event.id}/basketball-categories/${category.id}`,
                data,
                options,
            );
        } else {
            router.post(
                `/dashboard/events/${event.id}/basketball-categories`,
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
reset(toDefaultValues(category));
}
            }}
        >
            <DialogTrigger asChild>{trigger}</DialogTrigger>
            <DialogContent className="sm:max-w-lg">
                <form onSubmit={handleSubmit(onSubmit)}>
                    <DialogHeader>
                        <DialogTitle>
                            {isEditing ? 'Edit Category' : 'Add Category'}
                        </DialogTitle>
                        <DialogDescription>
                            {isEditing
                                ? `Update the details of the category "${category?.name}".`
                                : `Create a new category for the ${event.name} tournament.`}
                        </DialogDescription>
                    </DialogHeader>

                    <FieldGroup className="py-4">
                        <Controller
                            name="name"
                            control={control}
                            render={({ field, fieldState }) => (
                                <Field data-invalid={fieldState.invalid}>
                                    <FieldLabel htmlFor="category_name">
                                        Category Name
                                    </FieldLabel>
                                    <Input
                                        {...field}
                                        id="category_name"
                                        placeholder="Example: U-12 Boys"
                                        aria-invalid={fieldState.invalid}
                                        autoComplete="off"
                                        disabled={isSaving}
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
                            name="format"
                            control={control}
                            render={({ field, fieldState }) => (
                                <Field data-invalid={fieldState.invalid}>
                                    <FieldLabel>Tournament Format</FieldLabel>

                                    <Select
                                        value={field.value}
                                        onValueChange={field.onChange}
                                        disabled={isSaving}
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>

                                        <SelectContent>
                                            {CATEGORY_FORMATS.map((format) => (
                                                <SelectItem
                                                    key={format.value}
                                                    value={format.value}
                                                >
                                                    {format.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>

                                    {fieldState.invalid && (
                                        <FieldError errors={[fieldState.error]} />
                                    )}
                                </Field>
                            )}
                        />

                        <FieldGroup className="grid grid-cols-2 gap-4">
                            <Controller
                                name="min_team"
                                control={control}
                                render={({ field, fieldState }) => (
                                    <Field data-invalid={fieldState.invalid}>
                                        <FieldLabel htmlFor="min_team">
                                            Min. Teams
                                        </FieldLabel>
                                        <Input
                                            {...field}
                                            id="min_team"
                                            type="number"
                                            aria-invalid={fieldState.invalid}
                                            disabled={isSaving}
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
                                name="max_team"
                                control={control}
                                render={({ field, fieldState }) => (
                                    <Field data-invalid={fieldState.invalid}>
                                        <FieldLabel htmlFor="max_team">
                                            Max. Teams{' '}
                                            <span className="font-normal text-muted-foreground">
                                                (Optional)
                                            </span>
                                        </FieldLabel>
                                        <Input
                                            {...field}
                                            id="max_team"
                                            type="number"
                                            aria-invalid={fieldState.invalid}
                                            disabled={isSaving}
                                        />
                                        {fieldState.invalid && (
                                            <FieldError
                                                errors={[fieldState.error]}
                                            />
                                        )}
                                    </Field>
                                )}
                            />
                        </FieldGroup>

                        <FieldGroup className="grid grid-cols-2 gap-4">
                            <Controller
                                name="min_player_per_team"
                                control={control}
                                render={({ field, fieldState }) => (
                                    <Field data-invalid={fieldState.invalid}>
                                        <FieldLabel htmlFor="min_player_per_team">
                                            Min. Players/Team
                                        </FieldLabel>
                                        <Input
                                            {...field}
                                            id="min_player_per_team"
                                            type="number"
                                            aria-invalid={fieldState.invalid}
                                            disabled={isSaving}
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
                                name="max_player_per_team"
                                control={control}
                                render={({ field, fieldState }) => (
                                    <Field data-invalid={fieldState.invalid}>
                                        <FieldLabel htmlFor="max_player_per_team">
                                            Max. Players/Team{' '}
                                            <span className="font-normal text-muted-foreground">
                                                (Optional)
                                            </span>
                                        </FieldLabel>
                                        <Input
                                            {...field}
                                            id="max_player_per_team"
                                            type="number"
                                            aria-invalid={fieldState.invalid}
                                            disabled={isSaving}
                                        />
                                        {fieldState.invalid && (
                                            <FieldError
                                                errors={[fieldState.error]}
                                            />
                                        )}
                                    </Field>
                                )}
                            />
                        </FieldGroup>

                        <FieldGroup className="grid grid-cols-2 gap-4">
                            <Controller
                                name="max_player_per_coach"
                                control={control}
                                render={({ field, fieldState }) => (
                                    <Field data-invalid={fieldState.invalid}>
                                        <FieldLabel htmlFor="max_player_per_coach">
                                            Max. Players/Coach{' '}
                                            <span className="font-normal text-muted-foreground">
                                                (Optional)
                                            </span>
                                        </FieldLabel>
                                        <Input
                                            {...field}
                                            id="max_player_per_coach"
                                            type="number"
                                            aria-invalid={fieldState.invalid}
                                            disabled={isSaving || format === 'round_robin'}
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
                                name="quota"
                                control={control}
                                render={({ field, fieldState }) => (
                                    <Field data-invalid={fieldState.invalid}>
                                        <FieldLabel htmlFor="quota">
                                            Quota{' '}
                                            <span className="font-normal text-muted-foreground">
                                                (Optional)
                                            </span>
                                        </FieldLabel>
                                        <Input
                                            {...field}
                                            id="quota"
                                            type="number"
                                            aria-invalid={fieldState.invalid}
                                            disabled={isSaving}
                                        />
                                        {fieldState.invalid && (
                                            <FieldError
                                                errors={[fieldState.error]}
                                            />
                                        )}
                                    </Field>
                                )}
                            />
                        </FieldGroup>

                        <FieldGroup className="grid grid-cols-2 gap-4">
                            <Controller
                                name="price"
                                control={control}
                                render={({ field, fieldState }) => (
                                    <Field data-invalid={fieldState.invalid}>
                                        <FieldLabel htmlFor="price">
                                            Price (Rp){' '}
                                            <span className="font-normal text-muted-foreground">
                                                (Optional)
                                            </span>
                                        </FieldLabel>
                                        <Input
                                            {...field}
                                            id="price"
                                            type="number"
                                            step="0.01"
                                            placeholder="0"
                                            aria-invalid={fieldState.invalid}
                                            disabled={isSaving}
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
                                            disabled={isSaving}
                                        >
                                            <SelectTrigger
                                                id="status"
                                                aria-invalid={
                                                    fieldState.invalid
                                                }
                                                className="cursor-pointer"
                                            >
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {CATEGORY_STATUSES.map(
                                                    (option) => (
                                                        <SelectItem
                                                            key={option.value}
                                                            value={
                                                                option.value
                                                            }
                                                            className="cursor-pointer"
                                                        >
                                                            {option.label}
                                                        </SelectItem>
                                                    ),
                                                )}
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
                        </FieldGroup>
                    </FieldGroup>

                    <DialogFooter>
                        <Button type="submit" disabled={isSaving}>
                            {isSaving && (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            )}
                            {isSaving
                                ? 'Saving...'
                                : isEditing
                                    ? 'Save Changes'
                                    : 'Add Category'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}