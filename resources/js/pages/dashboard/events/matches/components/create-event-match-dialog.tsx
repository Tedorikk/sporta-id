import { zodResolver } from '@hookform/resolvers/zod';
import { router } from '@inertiajs/react';
import { Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Controller, useForm, useWatch, type Control } from 'react-hook-form';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
    MATCH_SERVER_FIELD_MAP,
    MatchFormFields,
    matchFieldsSchema,
    toScheduledAt,
    type MatchFormValues,
} from '@/pages/dashboard/events/basketball/matches/components/match-form';
import type { Event } from '@/types/event';
import type { CategoryWithFixtures } from '../types';

const createEventMatchSchema = matchFieldsSchema
    .extend({ category_id: z.string().min(1, 'Select a category') })
    .refine((data) => data.home_team_id !== data.away_team_id, {
        message: 'Home and away teams must be different',
        path: ['away_team_id'],
    });

type CreateEventMatchValues = z.infer<typeof createEventMatchSchema>;

function defaultValues(): CreateEventMatchValues {
    return {
        category_id: '',
        pool_id: '',
        home_team_id: '',
        away_team_id: '',
        round: 'group',
        match_number: '',
        date: '',
        time: '',
    };
}

export function CreateEventMatchDialog({ event, categories }: { event: Event; categories: CategoryWithFixtures[] }) {
    const [open, setOpen] = useState(false);
    const [saving, setSaving] = useState(false);

    const {
        control,
        handleSubmit,
        reset,
        setError,
        setValue,
        formState: { errors },
    } = useForm<CreateEventMatchValues>({
        resolver: zodResolver(createEventMatchSchema),
        defaultValues: defaultValues(),
        mode: 'onChange',
    });

    const categoryId = useWatch({ control, name: 'category_id' });
    const poolId = useWatch({ control, name: 'pool_id' });

    // Reset the whole form whenever the dialog is (re)opened.
    useEffect(() => {
        if (open) {
            reset(defaultValues());
        }
    }, [open, reset]);

    // Changing the category invalidates whatever pool/teams were picked from the old one.
    useEffect(() => {
        setValue('pool_id', '');
        setValue('home_team_id', '');
        setValue('away_team_id', '');
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [categoryId]);

    // Changing the pool invalidates whatever teams were picked from the old one.
    useEffect(() => {
        setValue('home_team_id', '');
        setValue('away_team_id', '');
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [poolId]);

    const selectedCategory = categories.find((category) => String(category.id) === categoryId);

    const onSubmit = (data: CreateEventMatchValues) => {
        setSaving(true);

        router.post(
            `/dashboard/events/${event.id}/basketball-categories/${data.category_id}/matches`,
            {
                pool_id: data.pool_id || null,
                home_team_id: data.home_team_id,
                away_team_id: data.away_team_id,
                round: data.round,
                match_number: data.match_number || null,
                scheduled_at: toScheduledAt(data.date, data.time),
            },
            {
                preserveScroll: true,
                onSuccess: () => setOpen(false),
                onError: (serverErrors) => {
                    Object.entries(serverErrors).forEach(([field, message]) => {
                        const formField = MATCH_SERVER_FIELD_MAP[field] ?? 'root';
                        setError(formField, { type: 'server', message: String(message) });
                    });
                },
                onFinish: () => setSaving(false),
            },
        );
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button size="sm">+ New Match</Button>
            </DialogTrigger>

            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Create Match</DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit(onSubmit)}>
                    <FieldGroup>
                        {errors.root && (
                            <p className="text-sm font-medium text-destructive">
                                {errors.root.message}
                            </p>
                        )}

                        <Controller
                            name="category_id"
                            control={control}
                            render={({ field, fieldState }) => (
                                <Field data-invalid={fieldState.invalid}>
                                    <FieldLabel htmlFor="category_id">Category</FieldLabel>
                                    <Select value={field.value} onValueChange={field.onChange}>
                                        <SelectTrigger id="category_id" aria-invalid={fieldState.invalid}>
                                            <SelectValue placeholder="Select Category" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {categories.map((category) => (
                                                <SelectItem key={category.id} value={String(category.id)}>
                                                    {category.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                                </Field>
                            )}
                        />

                        {selectedCategory && (
                            <MatchFormFields
                                // category_id is extra on this form; MatchFormFields only ever
                                // reads/writes the shared match fields, so this narrowing is safe.
                                control={control as unknown as Control<MatchFormValues>}
                                pools={selectedCategory.pools}
                                teams={selectedCategory.teams}
                                showPoolField={selectedCategory.pools.length > 0}
                            />
                        )}
                    </FieldGroup>

                    <DialogFooter className="mt-4">
                        <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={saving}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={saving || !selectedCategory}>
                            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                            {saving ? 'Creating...' : 'Create'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
