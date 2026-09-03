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

import type { BasketballEventCategory } from '@/types/basketball-event-category';
import type { Event } from '@/types/event';
import type { Team } from '@/types/team';

const TEAM_STATUSES = [
    { value: 'pending', label: 'Pending' },
    { value: 'verified', label: 'Verified' },
    { value: 'rejected', label: 'Rejected' },
];

const teamSchema = z.object({
    name: z.string().min(1, 'Team name is required').max(255),
    logo: z.string().url('Must be a valid URL').or(z.literal('')),
    status: z.enum(['pending', 'verified', 'rejected'] as const),
    basketball_event_category_id: z.string().optional(),
});

type TeamFormValues = z.infer<typeof teamSchema>;

type TeamFormProps = {
    event: Event;
    team?: Team;
    categories?: BasketballEventCategory[];
};

function toDefaultValues(team?: Team): TeamFormValues {
    return {
        name: team?.name ?? '',
        logo: team?.logo ?? '',
        status: (team?.status as TeamFormValues['status']) ?? 'pending',
        basketball_event_category_id: team?.basketball_event_category_id
            ? String(team.basketball_event_category_id)
            : undefined,
    };
}

function FormContent({ event, team, categories = [] }: TeamFormProps) {
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

        const payload = {
            ...data,
            basketball_event_category_id:
                data.basketball_event_category_id || null,
        };

        if (isEditing && team) {
            router.put(
                `/dashboard/events/${event.id}/teams/${team.id}`,
                payload,
                options,
            );
        } else {
            router.post(
                `/dashboard/events/${event.id}/teams`,
                payload,
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
                            name="basketball_event_category_id"
                            control={control}
                            render={({ field, fieldState }) => (
                                <Field data-invalid={fieldState.invalid}>
                                    <FieldLabel htmlFor="basketball_event_category_id">
                                        Category
                                    </FieldLabel>
                                    <Select
                                        value={field.value}
                                        onValueChange={field.onChange}
                                        disabled={isSaving}
                                    >
                                        <SelectTrigger
                                            id="basketball_event_category_id"
                                            aria-label="Select Category"
                                            aria-invalid={fieldState.invalid}
                                            className="cursor-pointer"
                                        >
                                            <SelectValue placeholder="Select Category (optional)" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {categories.map((category) => (
                                                <SelectItem
                                                    key={category.id}
                                                    value={String(category.id)}
                                                    className="cursor-pointer"
                                                >
                                                    {category.name}
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

export default function TeamForm({ event, team, categories }: TeamFormProps) {
    return <FormContent event={event} team={team} categories={categories} />;
}
