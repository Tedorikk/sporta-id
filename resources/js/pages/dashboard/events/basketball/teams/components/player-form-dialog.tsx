import { zodResolver } from '@hookform/resolvers/zod';
import { router } from '@inertiajs/react';
import { format } from 'date-fns';
import { CalendarIcon, Loader2, Plus } from 'lucide-react';
import { useState, useEffect  } from 'react';
import type {ReactNode} from 'react';
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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { UploadImage } from '@/components/upload-image';
import { cn } from '@/lib/utils';
import type { Event } from '@/types/event';
import type { Player } from '@/types/player';
import type { Team } from '@/types/team';
import type { BasketballClub } from './add-existing-player-dialog';

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
    basketball_club_id: z.string().or(z.literal('')),
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
        basketball_club_id: player?.basketball_club_id?.toString() ?? '',
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
    clubs: BasketballClub[];
    trigger: ReactNode;
};

export function PlayerFormDialog({
    event,
    team,
    player,
    clubs = [],
    trigger,
}: PlayerFormDialogProps) {
    const isEditing = Boolean(player);
    const [open, setOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // States for inline Club creation
    const [isCreatingClub, setIsCreatingClub] = useState(false);
    const [newClubName, setNewClubName] = useState('');
    const [isSavingClub, setIsSavingClub] = useState(false);
    const [clubError, setClubError] = useState('');
    const [pendingClubName, setPendingClubName] = useState('');

    const { control, handleSubmit, reset, setError, clearErrors, setValue } =
        useForm<PlayerFormValues>({
            resolver: zodResolver(playerSchema),
            defaultValues: toDefaultValues(player),
            mode: 'onChange',
        });

    // Auto-select the newly created club once it arrives in props
    useEffect(() => {
        if (pendingClubName && clubs.length > 0) {
            const newlyCreated = clubs.find(
                (c) => c.name.toLowerCase() === pendingClubName.toLowerCase()
            );

            if (newlyCreated) {
                setValue('basketball_club_id', newlyCreated.id.toString());
                setPendingClubName('');
                clearErrors('basketball_club_id');
            }
        }
    }, [clubs, pendingClubName, setValue, clearErrors]);

    const handleCreateClub = () => {
        if (!newClubName.trim()) {
return;
}

        setIsSavingClub(true);
        setClubError('');

        router.post(
            '/dashboard/basketball-clubs',
            { name: newClubName.trim() },
            {
                preserveScroll: true,
                preserveState: true,
                onSuccess: () => {
                    setIsSavingClub(false);
                    setIsCreatingClub(false);
                    setPendingClubName(newClubName.trim());
                    setNewClubName('');
                },
                onError: (errors) => {
                    setIsSavingClub(false);

                    if (errors.name) {
                        setClubError(errors.name);
                    }
                },
            }
        );
    };

    const onSubmit = (data: PlayerFormValues) => {
        const payload = {
            ...data,
            basketball_club_id: data.basketball_club_id === '' ? null : data.basketball_club_id,
        };

        const options = {
            preserveScroll: true,
            onStart: () => setIsSaving(true),
            onFinish: () => setIsSaving(false),
            onSuccess: () => setOpen(false),
        };

        if (isEditing && player) {
            router.put(
                `/dashboard/events/${event.id}/teams/${team.id}/players/${player.id}`,
                payload,
                options,
            );
        } else {
            router.post(
                `/dashboard/events/${event.id}/teams/${team.id}/players`,
                payload,
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

                if (!next) {
                    reset(toDefaultValues(player));
                    setIsCreatingClub(false);
                    setNewClubName('');
                    setClubError('');
                }
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

                        {/* Basketball Club with Inline Creation */}
                        <Controller
                            name="basketball_club_id"
                            control={control}
                            render={({ field, fieldState }) => (
                                <Field data-invalid={fieldState.invalid || !!clubError}>
                                    <div className="flex items-center justify-between">
                                        <FieldLabel htmlFor="basketball_club_id">
                                            Basketball Club{' '}
                                            <span className="font-normal text-muted-foreground">
                                                (Optional)
                                            </span>
                                        </FieldLabel>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            className="h-auto p-0 text-primary hover:bg-transparent hover:text-primary/80"
                                            onClick={() => {
                                                setIsCreatingClub(!isCreatingClub);
                                                setNewClubName('');
                                                setClubError('');
                                            }}
                                            disabled={isSaving}
                                        >
                                            {isCreatingClub ? 'Cancel' : <><Plus className="h-3 w-3 mr-1" /> Add New</>}
                                        </Button>
                                    </div>

                                    {isCreatingClub ? (
                                        <div className="flex items-center gap-2">
                                            <Input
                                                placeholder="Enter new club name..."
                                                value={newClubName}
                                                onChange={(e) => setNewClubName(e.target.value)}
                                                disabled={isSavingClub || isSaving}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') {
                                                        e.preventDefault();
                                                        handleCreateClub();
                                                    }
                                                }}
                                            />
                                            <Button
                                                type="button"
                                                size="sm"
                                                disabled={!newClubName.trim() || isSavingClub || isSaving}
                                                onClick={handleCreateClub}
                                            >
                                                {isSavingClub ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
                                            </Button>
                                        </div>
                                    ) : (
                                        <Select
                                            value={field.value}
                                            onValueChange={field.onChange}
                                            disabled={isSaving}
                                        >
                                            <SelectTrigger id="basketball_club_id">
                                                <SelectValue placeholder="Select a club..." />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="">None / Unaffiliated</SelectItem>
                                                {clubs.map((club) => (
                                                    <SelectItem key={club.id} value={club.id.toString()}>
                                                        {club.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    )}
                                    {clubError && (
                                        <p className="text-[0.8rem] font-medium text-destructive mt-1">
                                            {clubError}
                                        </p>
                                    )}
                                    {fieldState.invalid && !clubError && (
                                        <FieldError errors={[fieldState.error]} />
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
                        <Button type="submit" disabled={isSaving || isSavingClub}>
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