import { zodResolver } from '@hookform/resolvers/zod';
import { router } from '@inertiajs/react';
import { format } from 'date-fns';
import { CalendarIcon, Loader2 } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { useForm, Controller } from 'react-hook-form';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
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
    FieldDescription,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { UploadImage } from '@/components/upload-image';
import { cn } from '@/lib/utils';
import type { Event } from '@/types/event';
import type { Player } from '@/types/player';
import type { Team } from '@/types/team';

const playerSchema = z.object({
    name: z.string().min(1, 'Input player name').max(255),
    jersey_number: z
        .string()
        .min(1, 'Input jersey number')
        .max(3, 'Max 3 digits')
        .regex(/^\d+$/, 'Must be a number'),
    position: z.string().max(255).or(z.literal('')),
    photo: z.string().url('Must be a valid URL').or(z.literal('')),
    phone_number: z
        .string()
        .regex(/^\+[1-9]\d{1,14}$/, 'Invalid E.164 format')
        .or(z.literal('')),
    email: z.string().email('Must be a valid email').or(z.literal('')),
    dob: z.string().or(z.literal('')),
});

type PlayerFormValues = z.infer<typeof playerSchema>;

function toDefaultValues(player?: Player): PlayerFormValues {
    return {
        name: player?.name ?? '',
        jersey_number: player?.jersey_number ?? '',
        position: player?.position ?? '',
        photo: player?.photo ?? '',
        phone_number: player?.phone_number ?? '',
        email: player?.email ?? '',
        dob: player?.dob ?? '',
    };
}

function formatE164Input(value: string) {
    const digits = value.replace(/[^\d]/g, '').slice(0, 15);

    return digits ? `+${digits}` : '';
}

type PlayerFormDialogProps = {
    event: Event;
    team: Team;
    player?: Player;
    trigger: ReactNode;
};

export function PlayerFormDialog({
    event,
    team,
    player,
    trigger,
}: PlayerFormDialogProps) {
    const isEditing = Boolean(player);
    const [open, setOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    const { control, handleSubmit, reset, setError, clearErrors } =
        useForm<PlayerFormValues>({
            resolver: zodResolver(playerSchema),
            defaultValues: toDefaultValues(player),
            mode: 'onChange',
        });

    const onSubmit = (data: PlayerFormValues) => {
        const options = {
            preserveScroll: true,
            onStart: () => setIsSaving(true),
            onFinish: () => setIsSaving(false),
            onSuccess: () => setOpen(false),
        };

        if (isEditing && player) {
            router.put(
                `/dashboard/events/${event.id}/teams/${team.id}/players/${player.id}`,
                data,
                options,
            );
        } else {
            router.post(
                `/dashboard/events/${event.id}/teams/${team.id}/players`,
                data,
                {
                    ...options,
                    onSuccess: () => {
                        setOpen(false);
                        reset();
                    },
                },
            );
        }
    };

    return (
        <Dialog
            open={open}
            onOpenChange={(next) => {
                setOpen(next);
                if (!next) reset(toDefaultValues(player));
            }}
        >
            <DialogTrigger asChild>{trigger}</DialogTrigger>
            <DialogContent className="max-h-[80vh] overflow-y-auto">
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    <DialogHeader>
                        <DialogTitle>
                            {isEditing ? 'Edit Player' : 'Add New Player'}
                        </DialogTitle>
                        <DialogDescription>
                            {isEditing
                                ? `Update player data in ${team.name}.`
                                : `Add new player to ${team.name}.`}
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
                                        enableCrop={true}
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
                                    <FieldLabel htmlFor="player_name">
                                        Player Name
                                    </FieldLabel>
                                    <Input
                                        {...field}
                                        id="player_name"
                                        placeholder="Input Player Name"
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

                        <FieldGroup className="grid grid-cols-2 gap-4">
                            <Controller
                                name="jersey_number"
                                control={control}
                                render={({ field, fieldState }) => (
                                    <Field data-invalid={fieldState.invalid}>
                                        <FieldLabel htmlFor="jersey_number">
                                            Jersey Number
                                        </FieldLabel>
                                        <Input
                                            {...field}
                                            id="jersey_number"
                                            placeholder="Input Jersey Number"
                                            inputMode="numeric"
                                            aria-invalid={fieldState.invalid}
                                            autoComplete="off"
                                            disabled={isSaving}
                                            onChange={(e) =>
                                                field.onChange(
                                                    e.target.value
                                                        .replace(/\D/g, '')
                                                        .slice(0, 3),
                                                )
                                            }
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
                                name="position"
                                control={control}
                                render={({ field, fieldState }) => (
                                    <Field data-invalid={fieldState.invalid}>
                                        <FieldLabel htmlFor="position">
                                            Position{' '}
                                            <span className="font-normal text-muted-foreground">
                                                (Optional)
                                            </span>
                                        </FieldLabel>
                                        <Input
                                            {...field}
                                            id="position"
                                            placeholder="Input Position"
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
                        </FieldGroup>

                        <Controller
                            name="phone_number"
                            control={control}
                            render={({ field, fieldState }) => (
                                <Field data-invalid={fieldState.invalid}>
                                    <FieldLabel htmlFor="phone_number">
                                        Phone Number{' '}
                                        <span className="font-normal text-muted-foreground">
                                            (Optional)
                                        </span>
                                    </FieldLabel>
                                    <Input
                                        {...field}
                                        id="phone_number"
                                        placeholder="+628123456789"
                                        aria-invalid={fieldState.invalid}
                                        autoComplete="off"
                                        disabled={isSaving}
                                        onChange={(e) =>
                                            field.onChange(
                                                formatE164Input(
                                                    e.target.value,
                                                ),
                                            )
                                        }
                                    />
                                    <FieldDescription>
                                        Phone number in E.164 format, e.g.
                                        +628123456789
                                    </FieldDescription>
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
                                        Email{' '}
                                        <span className="font-normal text-muted-foreground">
                                            (Optional)
                                        </span>
                                    </FieldLabel>
                                    <Input
                                        {...field}
                                        id="email"
                                        type="email"
                                        placeholder="player@example.com"
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
                            name="dob"
                            control={control}
                            render={({ field, fieldState }) => (
                                <Field data-invalid={fieldState.invalid}>
                                    <FieldLabel htmlFor="dob">
                                        Date of Birth{' '}
                                        <span className="font-normal text-muted-foreground">
                                            (Optional)
                                        </span>
                                    </FieldLabel>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <Button
                                                id="dob"
                                                variant="outline"
                                                aria-invalid={fieldState.invalid}
                                                disabled={isSaving}
                                                className={cn(
                                                    'w-full cursor-pointer justify-start text-left font-normal',
                                                    !field.value && 'text-muted-foreground',
                                                )}
                                            >
                                                <CalendarIcon className="mr-2 h-4 w-4" />
                                                {field.value ? (
                                                    format(new Date(field.value), 'PPP')
                                                ) : (
                                                    <span>Pick a date</span>
                                                )}
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent
                                            className="w-auto p-0"
                                            align="start"
                                        >
                                            <Calendar
                                                mode="single"
                                                selected={
                                                    field.value
                                                        ? new Date(field.value)
                                                        : undefined
                                                }
                                                onSelect={(date) =>
                                                    field.onChange(
                                                        date ? format(date, 'yyyy-MM-dd') : ''
                                                    )
                                                }
                                                disabled={(date) => date > new Date()}
                                                autoFocus
                                                captionLayout="dropdown"
                                            />
                                        </PopoverContent>
                                    </Popover>
                                    {fieldState.invalid && (
                                        <FieldError errors={[fieldState.error]} />
                                    )}
                                </Field>
                            )}
                        />
                    </FieldGroup>

                    <DialogFooter>
                        <Button type="submit" disabled={isSaving}>
                            {isSaving && (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            )}
                            {isSaving
                                ? 'Saving...'
                                : isEditing
                                    ? 'Update Player'
                                    : 'Add New Player'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}