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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import type { Event } from '@/types/event';
import type { Meeting } from '@/types/meeting';
import type { Speaker } from '@/types/speaker';

const NO_SPEAKER = '__none__';

const meetingSchema = z
    .object({
        title: z.string().min(1, 'Input a title').max(255),
        speaker_id: z.string(),
        description: z.string().max(2000).or(z.literal('')),
        location: z.string().max(255).or(z.literal('')),
        scheduled_at: z.string().min(1, 'Input a start date/time'),
        ends_at: z.string().or(z.literal('')),
    })
    .refine((data) => !data.ends_at || data.ends_at >= data.scheduled_at, {
        message: 'End time must be on or after the start time',
        path: ['ends_at'],
    });

type MeetingFormValues = z.infer<typeof meetingSchema>;

function toDatetimeLocal(value: string | null | undefined) {
    if (!value) {
        return '';
    }

    // "2026-08-02 10:00:00" or ISO -> "2026-08-02T10:00"
    return value.replace(' ', 'T').slice(0, 16);
}

function toDefaultValues(meeting?: Meeting): MeetingFormValues {
    return {
        title: meeting?.title ?? '',
        speaker_id: meeting?.speaker_id ? String(meeting.speaker_id) : NO_SPEAKER,
        description: meeting?.description ?? '',
        location: meeting?.location ?? '',
        scheduled_at: toDatetimeLocal(meeting?.scheduled_at),
        ends_at: toDatetimeLocal(meeting?.ends_at),
    };
}

interface MeetingFormDialogProps {
    event: Event;
    speakers: Speaker[];
    meeting?: Meeting;
    trigger: ReactNode;
}

export function MeetingFormDialog({ event, speakers, meeting, trigger }: MeetingFormDialogProps) {
    const isEditing = Boolean(meeting);
    const [open, setOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    const { control, handleSubmit, reset } = useForm<MeetingFormValues>({
        resolver: zodResolver(meetingSchema),
        defaultValues: toDefaultValues(meeting),
        mode: 'onChange',
    });

    const onSubmit = (data: MeetingFormValues) => {
        const payload = {
            title: data.title,
            speaker_id: data.speaker_id === NO_SPEAKER ? null : data.speaker_id,
            description: data.description || null,
            location: data.location || null,
            scheduled_at: data.scheduled_at,
            ends_at: data.ends_at || null,
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

        if (isEditing && meeting) {
            router.put(`/dashboard/events/${event.id}/meetings/${meeting.id}`, payload, options);
        } else {
            router.post(`/dashboard/events/${event.id}/meetings`, payload, options);
        }
    };

    return (
        <Dialog
            open={open}
            onOpenChange={(next) => {
                setOpen(next);

                if (!next) {
                    reset(toDefaultValues(meeting));
                }
            }}
        >
            <DialogTrigger asChild>{trigger}</DialogTrigger>
            <DialogContent>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    <DialogHeader>
                        <DialogTitle>{isEditing ? 'Edit Meeting' : 'Add Meeting'}</DialogTitle>
                        <DialogDescription>Meetings make up the schedule attendees can check into.</DialogDescription>
                    </DialogHeader>

                    <FieldGroup className="py-2">
                        <Controller
                            name="title"
                            control={control}
                            render={({ field, fieldState }) => (
                                <Field data-invalid={fieldState.invalid}>
                                    <FieldLabel htmlFor="title">Title</FieldLabel>
                                    <Input id="title" placeholder="e.g. Opening Keynote" {...field} />
                                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                                </Field>
                            )}
                        />

                        <Controller
                            name="speaker_id"
                            control={control}
                            render={({ field, fieldState }) => (
                                <Field data-invalid={fieldState.invalid}>
                                    <FieldLabel htmlFor="speaker_id">Speaker</FieldLabel>
                                    <Select value={field.value} onValueChange={field.onChange}>
                                        <SelectTrigger id="speaker_id" className="w-full">
                                            <SelectValue placeholder="No speaker" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value={NO_SPEAKER}>No speaker</SelectItem>
                                            {speakers.map((speaker) => (
                                                <SelectItem key={speaker.id} value={String(speaker.id)}>
                                                    {speaker.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                                </Field>
                            )}
                        />

                        <div className="grid grid-cols-2 gap-4">
                            <Controller
                                name="scheduled_at"
                                control={control}
                                render={({ field, fieldState }) => (
                                    <Field data-invalid={fieldState.invalid}>
                                        <FieldLabel htmlFor="scheduled_at">Starts</FieldLabel>
                                        <Input id="scheduled_at" type="datetime-local" {...field} />
                                        {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                                    </Field>
                                )}
                            />
                            <Controller
                                name="ends_at"
                                control={control}
                                render={({ field, fieldState }) => (
                                    <Field data-invalid={fieldState.invalid}>
                                        <FieldLabel htmlFor="ends_at">
                                            Ends <span className="font-normal text-muted-foreground">(Optional)</span>
                                        </FieldLabel>
                                        <Input id="ends_at" type="datetime-local" {...field} />
                                        {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                                    </Field>
                                )}
                            />
                        </div>

                        <Controller
                            name="location"
                            control={control}
                            render={({ field, fieldState }) => (
                                <Field data-invalid={fieldState.invalid}>
                                    <FieldLabel htmlFor="location">
                                        Location <span className="font-normal text-muted-foreground">(Optional)</span>
                                    </FieldLabel>
                                    <Input id="location" placeholder="e.g. Main Hall" {...field} />
                                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                                </Field>
                            )}
                        />

                        <Controller
                            name="description"
                            control={control}
                            render={({ field, fieldState }) => (
                                <Field data-invalid={fieldState.invalid}>
                                    <FieldLabel htmlFor="description">
                                        Description <span className="font-normal text-muted-foreground">(Optional)</span>
                                    </FieldLabel>
                                    <Textarea id="description" rows={3} {...field} />
                                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                                </Field>
                            )}
                        />
                    </FieldGroup>

                    <DialogFooter>
                        <Button type="submit" disabled={isSaving}>
                            {isSaving ? 'Saving…' : isEditing ? 'Save changes' : 'Add meeting'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
