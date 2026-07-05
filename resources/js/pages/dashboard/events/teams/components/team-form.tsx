import { zodResolver } from '@hookform/resolvers/zod';
import { router } from '@inertiajs/react';
import { Loader2 } from 'lucide-react';
import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
    Field,
    FieldError,
    FieldGroup,
    FieldLabel,
    FieldDescription,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';

import { UploadImage } from '@/components/upload-image';

import type { Event } from '@/types/event';
import type { Team } from '@/types/team';

const TEAM_STATUSES = [
    { value: 'pending', label: 'Pending' },
    { value: 'verified', label: 'Verified' },
    { value: 'rejected', label: 'Rejected' },
]

const teamSchema = z.object({
    name: z.string().min(1, 'Team name is required').max(255),
    manager_name: z.string().min(1, 'Manager name is required').max(255),
    manager_phone: z
        .string()
        .regex(/^\+[1-9]\d{1,14}$/, 'Invalid E.164 format'),
    logo: z.string().url('Must be a valid URL').or(z.literal('')),
    status: z.enum(['pending', 'verified', 'rejected'] as const),
});

type TeamFormValues = z.infer<typeof teamSchema>;

type TeamFormProps = {
    event: Event;
    team?: Team;
};

function toDefaultValues(team?: Team): TeamFormValues {
    return {
        name: team?.name ?? '',
        manager_name: team?.manager_name ?? '',
        manager_phone: team?.manager_phone ?? '',
        logo: team?.logo ?? '',
        status: (team?.status as TeamFormValues['status']) ?? 'pending',
    };
}

function formatE164Input(value: string) {
    // Force a leading "+", strip everything else that isn't a digit,
    // and cap at 15 digits (E.164 max length)
    const digits = value.replace(/[^\d]/g, '').slice(0, 15);

    return digits ? `+${digits}` : '';
}

function FormContent({ event, team }: TeamFormProps) {
    const isEditing = Boolean(team);
    const [isSaving, setIsSaving] = useState(false);

    const { control, handleSubmit, setError, clearErrors } =
        useForm<TeamFormValues>({
            resolver: zodResolver(teamSchema),
            defaultValues: toDefaultValues(team),
            mode: 'onChange',
        });

    const onSubmit = (data: TeamFormValues) => {
        const options = {
            onStart: () => setIsSaving(true),
            onFinish: () => setIsSaving(false),
        };

        if (isEditing && team) {
            router.put(
                `/dashboard/events/${event.id}/teams/${team.id}`,
                data,
                options,
            );
        } else {
            router.post(
                `/dashboard/events/${event.id}/teams`,
                data,
                options,
            );
        }
    };

    return (
        <form onSubmit={handleSubmit(onSubmit)}>
            <FieldGroup>
                <FieldGroup className="grid grid-cols-2">
                    <Controller
                        name="logo"
                        control={control}
                        render={({ field, fieldState }) => (
                            <Field
                                data-invalid={fieldState.invalid}
                                className="columns-1"
                            >
                                <FieldLabel htmlFor="logo">
                                    Team Logo
                                </FieldLabel>
                                <UploadImage
                                    {...field}
                                    ratio={1}
                                    value={field.value}
                                    onChange={(value) => {
                                        clearErrors('logo');
                                        field.onChange(value);
                                    }}
                                    onError={(error) => {
                                        setError('logo', {
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
                                    <FieldError errors={[fieldState.error]} />
                                )}
                            </Field>
                        )}
                    />
                    <FieldGroup>
                        <Controller
                            name="name"
                            control={control}
                            render={({ field, fieldState }) => (
                                <Field data-invalid={fieldState.invalid}>
                                    <FieldLabel htmlFor="name">
                                        Team Name
                                    </FieldLabel>
                                    <Input
                                        {...field}
                                        id="name"
                                        placeholder="Input Team Name"
                                        aria-label="Team Name"
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
                            name="manager_name"
                            control={control}
                            render={({ field, fieldState }) => (
                                <Field data-invalid={fieldState.invalid}>
                                    <FieldLabel htmlFor="manager_name">
                                        Manager Name
                                    </FieldLabel>
                                    <Input
                                        {...field}
                                        id="manager_name"
                                        placeholder="Input Manager Name"
                                        aria-label="Manager Name"
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
                            name="manager_phone"
                            control={control}
                            render={({ field, fieldState }) => (
                                <Field data-invalid={fieldState.invalid}>
                                    <FieldLabel htmlFor="manager_phone">
                                        Manager Contact (WA)
                                    </FieldLabel>
                                    <Input
                                        {...field}
                                        id="manager_phone"
                                        placeholder="+628123456789"
                                        aria-label="Manager Contact (WA)"
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
                            name="status"
                            control={control}
                            render={({ field, fieldState }) => (
                                <Field data-invalid={fieldState.invalid}>
                                    <FieldLabel htmlFor="status">
                                        Verification Status
                                    </FieldLabel>
                                    <Select
                                        value={field.value}
                                        onValueChange={field.onChange}
                                        disabled={isSaving}
                                    >
                                        <SelectTrigger
                                            id="status"
                                            aria-label="Select Verification Status"
                                            aria-invalid={fieldState.invalid}
                                            className="cursor-pointer"
                                        >
                                            <SelectValue placeholder="Select Status" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {TEAM_STATUSES.map((option) => (
                                                <SelectItem
                                                    key={option.value}
                                                    value={option.value}
                                                    className="cursor-pointer"
                                                >
                                                    {option.label}
                                                </SelectItem>
                                            ))}
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

                        <Button
                            type="submit"
                            className="mt-2 cursor-pointer"
                            disabled={isSaving}
                        >
                            {isSaving && (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            )}
                            {isSaving
                                ? isEditing
                                    ? 'Saving...'
                                    : 'Creating...'
                                : isEditing
                                    ? 'Save Changes'
                                    : 'Create Team'}
                        </Button>
                    </FieldGroup>
                </FieldGroup>
            </FieldGroup>
        </form>
    );
}

export default function TeamForm({ event, team }: TeamFormProps) {
    return <FormContent event={event} team={team} />;
}