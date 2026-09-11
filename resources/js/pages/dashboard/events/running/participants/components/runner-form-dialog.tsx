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
import type { RaceParticipant } from '@/types/race-participant';
import type { RunningEventCategory } from '@/types/running-event-category';

const runnerSchema = z.object({
    name: z.string().min(1, 'Input a name').max(255),
    bib_number: z.string().max(255),
    email: z.string().email('Must be a valid email').or(z.literal('')),
    phone: z.string().max(255),
});

type RunnerFormValues = z.infer<typeof runnerSchema>;

function toDefaultValues(
    participant?: RaceParticipant,
    suggestedBib?: string,
): RunnerFormValues {
    return {
        name: participant?.name ?? '',
        bib_number: participant?.bib_number ?? suggestedBib ?? '',
        email: participant?.email ?? '',
        phone: participant?.phone ?? '',
    };
}

interface RunnerFormDialogProps {
    eventId: number;
    category: RunningEventCategory;
    participant?: RaceParticipant;
    /** Next free bib, pre-filled for a walk-in so staff rarely have to think. */
    suggestedBib?: string;
    trigger: ReactNode;
}

export function RunnerFormDialog({
    eventId,
    category,
    participant,
    suggestedBib,
    trigger,
}: RunnerFormDialogProps) {
    const isEditing = Boolean(participant);
    const [open, setOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    const { control, handleSubmit, reset } = useForm<RunnerFormValues>({
        resolver: zodResolver(runnerSchema),
        defaultValues: toDefaultValues(participant, suggestedBib),
        mode: 'onChange',
    });

    const onSubmit = (data: RunnerFormValues) => {
        const options = {
            preserveScroll: true,
            onStart: () => setIsSaving(true),
            onFinish: () => setIsSaving(false),
            onSuccess: () => {
                setOpen(false);
                reset(toDefaultValues(participant, suggestedBib));
            },
        };

        const base = `/dashboard/events/${eventId}/running-categories/${category.id}/participants`;

        if (isEditing && participant) {
            router.put(`${base}/${participant.id}`, data, options);
        } else {
            router.post(base, data, options);
        }
    };

    return (
        <Dialog
            open={open}
            onOpenChange={(next) => {
                setOpen(next);

                if (!next) {
                    reset(toDefaultValues(participant, suggestedBib));
                }
            }}
        >
            <DialogTrigger asChild>{trigger}</DialogTrigger>
            <DialogContent>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    <DialogHeader>
                        <DialogTitle>
                            {isEditing ? 'Edit Runner' : 'Add Runner'}
                        </DialogTitle>
                        <DialogDescription>
                            {category.name} · a runner added here needs no
                            registration, for walk-ins and invited elites.
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
                                        placeholder="Nadia Putri"
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
                            name="bib_number"
                            control={control}
                            render={({ field, fieldState }) => (
                                <Field data-invalid={fieldState.invalid}>
                                    <FieldLabel htmlFor="bib_number">
                                        Bib number
                                    </FieldLabel>
                                    <Input
                                        {...field}
                                        id="bib_number"
                                        placeholder="Leave empty to assign later"
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
                            name="email"
                            control={control}
                            render={({ field, fieldState }) => (
                                <Field data-invalid={fieldState.invalid}>
                                    <FieldLabel htmlFor="email">
                                        Email
                                    </FieldLabel>
                                    <Input
                                        {...field}
                                        id="email"
                                        type="email"
                                        placeholder="Optional"
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
                            name="phone"
                            control={control}
                            render={({ field, fieldState }) => (
                                <Field data-invalid={fieldState.invalid}>
                                    <FieldLabel htmlFor="phone">
                                        Phone
                                    </FieldLabel>
                                    <Input
                                        {...field}
                                        id="phone"
                                        placeholder="Optional"
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
