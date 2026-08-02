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
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { UploadImage } from '@/components/upload-image';
import type { Event } from '@/types/event';
import type { Speaker } from '@/types/speaker';

const speakerSchema = z.object({
    name: z.string().min(1, 'Input a name').max(255),
    photo: z.string().url('Must be a valid URL').or(z.literal('')),
    title: z.string().max(255).or(z.literal('')),
    bio: z.string().max(2000).or(z.literal('')),
});

type SpeakerFormValues = z.infer<typeof speakerSchema>;

function toDefaultValues(speaker?: Speaker): SpeakerFormValues {
    return {
        name: speaker?.name ?? '',
        photo: speaker?.photo ?? '',
        title: speaker?.title ?? '',
        bio: speaker?.bio ?? '',
    };
}

interface SpeakerFormDialogProps {
    event: Event;
    speaker?: Speaker;
    trigger: ReactNode;
}

export function SpeakerFormDialog({ event, speaker, trigger }: SpeakerFormDialogProps) {
    const isEditing = Boolean(speaker);
    const [open, setOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    const { control, handleSubmit, reset, setError } = useForm<SpeakerFormValues>({
        resolver: zodResolver(speakerSchema),
        defaultValues: toDefaultValues(speaker),
        mode: 'onChange',
    });

    const onSubmit = (data: SpeakerFormValues) => {
        const options = {
            preserveScroll: true,
            onStart: () => setIsSaving(true),
            onFinish: () => setIsSaving(false),
            onSuccess: () => {
                setOpen(false);
                reset();
            },
        };

        if (isEditing && speaker) {
            router.put(`/dashboard/events/${event.id}/speakers/${speaker.id}`, data, options);
        } else {
            router.post(`/dashboard/events/${event.id}/speakers`, data, options);
        }
    };

    return (
        <Dialog
            open={open}
            onOpenChange={(next) => {
                setOpen(next);

                if (!next) {
                    reset(toDefaultValues(speaker));
                }
            }}
        >
            <DialogTrigger asChild>{trigger}</DialogTrigger>
            <DialogContent>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    <DialogHeader>
                        <DialogTitle>{isEditing ? 'Edit Speaker' : 'Add Speaker'}</DialogTitle>
                        <DialogDescription>Speakers can be reused across multiple meetings for this event.</DialogDescription>
                    </DialogHeader>

                    <FieldGroup className="py-2">
                        <Controller
                            name="photo"
                            control={control}
                            render={({ field, fieldState }) => (
                                <Field data-invalid={fieldState.invalid} className="mx-auto w-24">
                                    <FieldLabel htmlFor="photo">Photo</FieldLabel>
                                    <UploadImage
                                        {...field}
                                        ratio={1}
                                        value={field.value}
                                        onChange={(value) => field.onChange(value ?? '')}
                                        onError={(error) =>
                                            setError('photo', {
                                                type: 'manual',
                                                message: typeof error === 'string' ? error : 'Upload failed',
                                            })
                                        }
                                        enableCrop
                                    />
                                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
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
                                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                                </Field>
                            )}
                        />

                        <Controller
                            name="title"
                            control={control}
                            render={({ field, fieldState }) => (
                                <Field data-invalid={fieldState.invalid}>
                                    <FieldLabel htmlFor="title">
                                        Title <span className="font-normal text-muted-foreground">(role, company, etc.)</span>
                                    </FieldLabel>
                                    <Input id="title" placeholder="e.g. CTO, Acme Inc." {...field} />
                                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                                </Field>
                            )}
                        />

                        <Controller
                            name="bio"
                            control={control}
                            render={({ field, fieldState }) => (
                                <Field data-invalid={fieldState.invalid}>
                                    <FieldLabel htmlFor="bio">
                                        Bio <span className="font-normal text-muted-foreground">(Optional)</span>
                                    </FieldLabel>
                                    <Textarea id="bio" rows={3} {...field} />
                                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                                </Field>
                            )}
                        />
                    </FieldGroup>

                    <DialogFooter>
                        <Button type="submit" disabled={isSaving}>
                            {isSaving ? 'Saving…' : isEditing ? 'Save changes' : 'Add speaker'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
