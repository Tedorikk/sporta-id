import { zodResolver } from '@hookform/resolvers/zod';
import { router } from '@inertiajs/react';
import { Loader2 } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { useForm, Controller } from 'react-hook-form';
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
});

type PlayerFormValues = z.infer<typeof playerSchema>;

function toDefaultValues(player?: Player): PlayerFormValues {
    return {
        name: player?.name ?? '',
        jersey_number: player?.jersey_number ?? '',
        position: player?.position ?? '',
    };
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

    const { control, handleSubmit, reset } = useForm<PlayerFormValues>({
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
            <DialogContent>
                <form onSubmit={handleSubmit(onSubmit)}>
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