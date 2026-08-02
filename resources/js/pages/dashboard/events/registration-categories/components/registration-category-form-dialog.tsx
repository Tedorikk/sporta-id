import { zodResolver } from '@hookform/resolvers/zod';
import { router } from '@inertiajs/react';
import { GripVertical, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import type { ReactNode } from 'react';
import { Controller, useFieldArray, useForm } from 'react-hook-form';
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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import type { Event } from '@/types/event';
import {
    REGISTRATION_FIELD_TYPES,
    type RegistrationCategory,
    type RegistrationFieldType,
} from '@/types/registration-category';

const fieldSchema = z.object({
    key: z
        .string()
        .min(1, 'Required')
        .max(100)
        .regex(/^[a-z0-9_]+$/, 'Lowercase letters, numbers, underscores only'),
    label: z.string().min(1, 'Required').max(255),
    type: z.enum(REGISTRATION_FIELD_TYPES.map((t) => t.value) as [RegistrationFieldType, ...RegistrationFieldType[]]),
    required: z.boolean(),
    optionsText: z.string().max(1000).optional(),
    help_text: z.string().max(500).optional(),
});

const categorySchema = z.object({
    name: z.string().min(1, 'Input a name').max(255),
    subject_type: z.enum(['team', 'individual']),
    price: z.string().max(20).optional(),
    quota: z.string().max(10).optional(),
    registration_open: z.boolean(),
    form_schema: z.array(fieldSchema),
});

type CategoryFormValues = z.infer<typeof categorySchema>;

function toDefaultValues(category?: RegistrationCategory): CategoryFormValues {
    return {
        name: category?.name ?? '',
        subject_type: category?.subject_type ?? 'team',
        price: category?.price ?? '',
        quota: category?.quota != null ? String(category.quota) : '',
        registration_open: category?.registration_open ?? true,
        form_schema: (category?.form_schema ?? []).map((f) => ({
            key: f.key,
            label: f.label,
            type: f.type,
            required: f.required,
            optionsText: (f.options ?? []).join(', '),
            help_text: f.help_text ?? '',
        })),
    };
}

function emptyField(): CategoryFormValues['form_schema'][number] {
    return { key: '', label: '', type: 'text', required: false, optionsText: '', help_text: '' };
}

interface RegistrationCategoryFormDialogProps {
    event: Event;
    registrationCategory?: RegistrationCategory;
    trigger: ReactNode;
}

export function RegistrationCategoryFormDialog({ event, registrationCategory, trigger }: RegistrationCategoryFormDialogProps) {
    const isEditing = Boolean(registrationCategory);
    const [open, setOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    const { control, handleSubmit, reset, watch } = useForm<CategoryFormValues>({
        resolver: zodResolver(categorySchema),
        defaultValues: toDefaultValues(registrationCategory),
        mode: 'onChange',
    });

    const { fields, append, remove } = useFieldArray({ control, name: 'form_schema' });

    const onSubmit = (data: CategoryFormValues) => {
        const payload = {
            name: data.name,
            subject_type: data.subject_type,
            price: data.price ? data.price : null,
            quota: data.quota ? data.quota : null,
            registration_open: data.registration_open,
            form_schema: data.form_schema.map((f) => ({
                key: f.key,
                label: f.label,
                type: f.type,
                required: f.required,
                options: ['select', 'radio'].includes(f.type)
                    ? (f.optionsText ?? '').split(',').map((o) => o.trim()).filter(Boolean)
                    : undefined,
                help_text: f.help_text || null,
            })),
        };

        const options = {
            preserveScroll: true,
            onStart: () => setIsSaving(true),
            onFinish: () => setIsSaving(false),
            onSuccess: () => {
                setOpen(false);
                reset();
            },
        };

        if (isEditing && registrationCategory) {
            router.put(`/dashboard/events/${event.id}/registration-categories/${registrationCategory.id}`, payload, options);
        } else {
            router.post(`/dashboard/events/${event.id}/registration-categories`, payload, options);
        }
    };

    return (
        <Dialog
            open={open}
            onOpenChange={(next) => {
                setOpen(next);

                if (!next) {
                    reset(toDefaultValues(registrationCategory));
                }
            }}
        >
            <DialogTrigger asChild>{trigger}</DialogTrigger>
            <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    <DialogHeader>
                        <DialogTitle>{isEditing ? 'Edit Registration Category' : 'Add Registration Category'}</DialogTitle>
                        <DialogDescription>
                            A registration category defines who can sign up (a team or an individual), what it costs, and the questions
                            they answer.
                        </DialogDescription>
                    </DialogHeader>

                    <FieldGroup className="py-2">
                        <Controller
                            name="name"
                            control={control}
                            render={({ field, fieldState }) => (
                                <Field data-invalid={fieldState.invalid}>
                                    <FieldLabel htmlFor="name">Name</FieldLabel>
                                    <Input id="name" placeholder="e.g. 5K Run, Men's Division A" {...field} />
                                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                                </Field>
                            )}
                        />

                        <div className="grid grid-cols-2 gap-4">
                            <Controller
                                name="subject_type"
                                control={control}
                                render={({ field, fieldState }) => (
                                    <Field data-invalid={fieldState.invalid}>
                                        <FieldLabel htmlFor="subject_type">Who registers</FieldLabel>
                                        <Select value={field.value} onValueChange={field.onChange} disabled={isEditing}>
                                            <SelectTrigger id="subject_type" className="w-full">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="team">A team</SelectItem>
                                                <SelectItem value="individual">An individual</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                                    </Field>
                                )}
                            />

                            <Controller
                                name="registration_open"
                                control={control}
                                render={({ field }) => (
                                    <Field orientation="horizontal" className="items-center pt-6">
                                        <Switch id="registration_open" checked={field.value} onCheckedChange={field.onChange} />
                                        <FieldLabel htmlFor="registration_open" className="font-normal">
                                            Open for registration
                                        </FieldLabel>
                                    </Field>
                                )}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <Controller
                                name="price"
                                control={control}
                                render={({ field, fieldState }) => (
                                    <Field data-invalid={fieldState.invalid}>
                                        <FieldLabel htmlFor="price">
                                            Price <span className="font-normal text-muted-foreground">(blank = free)</span>
                                        </FieldLabel>
                                        <Input id="price" type="number" min={0} step="0.01" placeholder="0" {...field} />
                                        {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                                    </Field>
                                )}
                            />
                            <Controller
                                name="quota"
                                control={control}
                                render={({ field, fieldState }) => (
                                    <Field data-invalid={fieldState.invalid}>
                                        <FieldLabel htmlFor="quota">
                                            Quota <span className="font-normal text-muted-foreground">(blank = unlimited)</span>
                                        </FieldLabel>
                                        <Input id="quota" type="number" min={1} step="1" placeholder="Unlimited" {...field} />
                                        {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                                    </Field>
                                )}
                            />
                        </div>

                        <div className="space-y-3 rounded-lg border p-3">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium">Form fields</p>
                                    <p className="text-xs text-muted-foreground">
                                        Name is always collected. Add any extra questions this category needs.
                                    </p>
                                </div>
                                <Button type="button" variant="outline" size="sm" onClick={() => append(emptyField())}>
                                    <Plus className="mr-1 h-3.5 w-3.5" />
                                    Add field
                                </Button>
                            </div>

                            {fields.length === 0 && (
                                <p className="rounded-md border border-dashed py-4 text-center text-xs text-muted-foreground">
                                    No extra fields yet.
                                </p>
                            )}

                            <div className="space-y-3">
                                {fields.map((item, index) => {
                                    const type = watch(`form_schema.${index}.type`);

                                    return (
                                        <div key={item.id} className="space-y-2 rounded-md border bg-muted/30 p-3">
                                            <div className="flex items-center gap-2">
                                                <GripVertical className="h-4 w-4 shrink-0 text-muted-foreground" />

                                                <Controller
                                                    name={`form_schema.${index}.label`}
                                                    control={control}
                                                    render={({ field, fieldState }) => (
                                                        <Field data-invalid={fieldState.invalid} className="flex-1">
                                                            <Input placeholder="Label, e.g. Shirt Size" {...field} />
                                                            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                                                        </Field>
                                                    )}
                                                />

                                                <Controller
                                                    name={`form_schema.${index}.type`}
                                                    control={control}
                                                    render={({ field }) => (
                                                        <Select value={field.value} onValueChange={field.onChange}>
                                                            <SelectTrigger className="w-40 shrink-0">
                                                                <SelectValue />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                {REGISTRATION_FIELD_TYPES.map((t) => (
                                                                    <SelectItem key={t.value} value={t.value}>
                                                                        {t.label}
                                                                    </SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                    )}
                                                />

                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon"
                                                    className="shrink-0 text-muted-foreground hover:text-destructive"
                                                    onClick={() => remove(index)}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>

                                            <div className="grid grid-cols-2 gap-2 pl-6">
                                                <Controller
                                                    name={`form_schema.${index}.key`}
                                                    control={control}
                                                    render={({ field, fieldState }) => (
                                                        <Field data-invalid={fieldState.invalid}>
                                                            <Input placeholder="key, e.g. shirt_size" {...field} />
                                                            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                                                        </Field>
                                                    )}
                                                />

                                                <Controller
                                                    name={`form_schema.${index}.required`}
                                                    control={control}
                                                    render={({ field }) => (
                                                        <Field orientation="horizontal" className="items-center">
                                                            <Checkbox
                                                                checked={field.value}
                                                                onCheckedChange={(checked) => field.onChange(Boolean(checked))}
                                                            />
                                                            <FieldLabel className="font-normal">Required</FieldLabel>
                                                        </Field>
                                                    )}
                                                />
                                            </div>

                                            {(type === 'select' || type === 'radio') && (
                                                <div className="pl-6">
                                                    <Controller
                                                        name={`form_schema.${index}.optionsText`}
                                                        control={control}
                                                        render={({ field }) => (
                                                            <Field>
                                                                <Input placeholder="Options, comma separated: S, M, L, XL" {...field} />
                                                            </Field>
                                                        )}
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </FieldGroup>

                    <DialogFooter>
                        <Button type="submit" disabled={isSaving}>
                            {isSaving ? 'Saving…' : isEditing ? 'Save changes' : 'Add category'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
