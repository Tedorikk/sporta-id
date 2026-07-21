import { zodResolver } from '@hookform/resolvers/zod';
import { Head, router } from '@inertiajs/react';
import { format } from 'date-fns';
import { CalendarIcon, CheckCircle2, Loader2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
    Field,
    FieldDescription,
    FieldError,
    FieldGroup,
    FieldLabel,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { PublicPageHeader } from '@/components/public/public-page-header';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { UploadImage } from '@/components/upload-image';
import { useForceLightMode } from '@/hooks/use-force-light-mode';
import { cn } from '@/lib/utils';
import type { BasketballEventCategory } from '@/types/basketball-event-category';
import type { Event } from '@/types/event';
import { PLAYER_ROLES } from '@/types/player';
import type { Team } from '@/types/team';

type RegisterCategory = BasketballEventCategory & { teams: Team[] };

interface Props {
    event: Event;
    categories: RegisterCategory[];
}

const roleValues = PLAYER_ROLES.map((r) => r.value) as [string, ...string[]];

const registerSchema = z
    .object({
        basketball_event_category_id: z.string().min(1, 'Please select a category'),
        team_id: z.string().min(1, 'Please select a team'),
        photo: z.string().url('Must be a valid URL').or(z.literal('')),
        certificate: z.string().url('Must be a valid URL').or(z.literal('')),
        role: z.enum(roleValues, { message: 'Please select a role' }),
        name: z.string().min(1, 'Input your name').max(255),
        jersey_number: z.string().max(3, 'Max 3 digits').regex(/^\d*$/, 'Must be a number').or(z.literal('')),
        position: z.string().max(255).or(z.literal('')),
        phone_number: z
            .string()
            .regex(/^\+[1-9]\d{1,14}$/, 'Invalid E.164 format')
            .or(z.literal('')),
        email: z.string().email('Must be a valid email').or(z.literal('')),
        dob: z.string().or(z.literal('')),
    })
    .superRefine((data, ctx) => {
        if (data.role === 'player' && !data.jersey_number) {
            ctx.addIssue({
                code: 'custom',
                path: ['jersey_number'],
                message: 'Input jersey number',
            });
        }

        if (data.role === 'medic' && !data.certificate) {
            ctx.addIssue({
                code: 'custom',
                path: ['certificate'],
                message: 'Upload your medic certificate',
            });
        }
    });

type RegisterFormValues = z.infer<typeof registerSchema>;

function formatE164Input(value: string) {
    const digits = value.replace(/[^\d]/g, '').slice(0, 15);

    return digits ? `+${digits}` : '';
}

export default function Register({ event, categories }: Props) {
    useForceLightMode();

    const [isSaving, setIsSaving] = useState(false);

    const { control, handleSubmit, watch, resetField, setError } =
        useForm<RegisterFormValues>({
            resolver: zodResolver(registerSchema),
            defaultValues: {
                basketball_event_category_id: '',
                team_id: '',
                photo: '',
                certificate: '',
                role: 'player',
                name: '',
                jersey_number: '',
                position: '',
                phone_number: '',
                email: '',
                dob: '',
            },
            mode: 'onChange',
        });

    const selectedCategoryId = watch('basketball_event_category_id');
    const selectedRole = watch('role');
    const isPlayerRole = selectedRole === 'player';
    const isMedicRole = selectedRole === 'medic';

    const teamsForCategory = useMemo(() => {
        const category = categories.find(
            (c) => String(c.id) === selectedCategoryId,
        );

        return category?.teams ?? [];
    }, [categories, selectedCategoryId]);

    const onSubmit = (data: RegisterFormValues) => {
        setIsSaving(true);

        router.post(`/events/${event.id}/register`, data, {
            onFinish: () => setIsSaving(false),
            onError: (errors) => {
                Object.entries(errors).forEach(([field, message]) => {
                    setError(field as keyof RegisterFormValues, {
                        type: 'manual',
                        message: message as string,
                    });
                });
            },
        });
    };

    return (
        <>
            <Head title={`Team Registration — ${event.name}`} />

            <div className="relative flex min-h-screen items-center justify-center bg-neutral-950 px-4 py-10">
                <div className="pointer-events-none absolute inset-0 overflow-hidden">
                    <div className="absolute -top-40 -left-40 h-96 w-96 rounded-full bg-red-600/10 blur-3xl" />
                    <div className="absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-red-900/20 blur-3xl" />
                </div>

                <div className="relative z-10 w-full max-w-md overflow-hidden rounded-3xl border-2 border-black bg-white shadow-2xl">
                    <PublicPageHeader
                        eyebrow="Team Registration"
                        title={event.name}
                        subtitle="Pick your category, team, and role, then fill in your details"
                    />

                    <form onSubmit={handleSubmit(onSubmit)} className="px-6 py-6">
                        <FieldGroup>
                            <Controller
                                name="photo"
                                control={control}
                                render={({ field, fieldState }) => (
                                    <Field data-invalid={fieldState.invalid} className="mx-auto w-32">
                                        <FieldLabel htmlFor="photo">
                                            Photo
                                        </FieldLabel>
                                        <UploadImage
                                            {...field}
                                            ratio={4 / 5}
                                            value={field.value}
                                            uploadUrl="/public-upload/image"
                                            deleteUrl="/public-upload/image"
                                            onChange={(value) => field.onChange(value ?? '')}
                                            onError={(error) =>
                                                setError('photo', {
                                                    type: 'manual',
                                                    message: typeof error === 'string' ? error : 'Upload failed',
                                                })
                                            }
                                            enableCrop
                                            className="rounded-2xl border-2 border-black"
                                        />
                                        {fieldState.invalid && (
                                            <FieldError errors={[fieldState.error]} />
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
                                            onValueChange={(value) => {
                                                field.onChange(value);
                                                resetField('team_id');
                                            }}
                                            disabled={isSaving}
                                        >
                                            <SelectTrigger
                                                id="basketball_event_category_id"
                                                aria-invalid={fieldState.invalid}
                                                className="w-full cursor-pointer border-2 border-black font-semibold focus-visible:ring-red-600"
                                            >
                                                <SelectValue placeholder="Select your category" />
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
                                            <FieldError errors={[fieldState.error]} />
                                        )}
                                    </Field>
                                )}
                            />

                            <Controller
                                name="team_id"
                                control={control}
                                render={({ field, fieldState }) => (
                                    <Field data-invalid={fieldState.invalid}>
                                        <FieldLabel htmlFor="team_id">Team</FieldLabel>
                                        <Select
                                            value={field.value}
                                            onValueChange={field.onChange}
                                            disabled={isSaving || !selectedCategoryId}
                                        >
                                            <SelectTrigger
                                                id="team_id"
                                                aria-invalid={fieldState.invalid}
                                                className="w-full cursor-pointer border-2 border-black font-semibold focus-visible:ring-red-600"
                                            >
                                                <SelectValue
                                                    placeholder={
                                                        selectedCategoryId
                                                            ? 'Select your team'
                                                            : 'Select a category first'
                                                    }
                                                />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {teamsForCategory.map((team) => (
                                                    <SelectItem
                                                        key={team.id}
                                                        value={String(team.id)}
                                                        className="cursor-pointer"
                                                    >
                                                        {team.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        {selectedCategoryId && teamsForCategory.length === 0 && (
                                            <FieldDescription>
                                                No teams available in this category yet.
                                            </FieldDescription>
                                        )}
                                        {fieldState.invalid && (
                                            <FieldError errors={[fieldState.error]} />
                                        )}
                                    </Field>
                                )}
                            />

                            <Controller
                                name="role"
                                control={control}
                                render={({ field, fieldState }) => (
                                    <Field data-invalid={fieldState.invalid}>
                                        <FieldLabel htmlFor="role">Role</FieldLabel>
                                        <Select
                                            value={field.value}
                                            onValueChange={(value) => {
                                                field.onChange(value);

                                                if (value !== 'player') {
                                                    resetField('jersey_number');
                                                    resetField('position');
                                                }

                                                if (value !== 'medic') {
                                                    resetField('certificate');
                                                }
                                            }}
                                            disabled={isSaving}
                                        >
                                            <SelectTrigger
                                                id="role"
                                                aria-invalid={fieldState.invalid}
                                                className="w-full cursor-pointer border-2 border-black font-semibold focus-visible:ring-red-600"
                                            >
                                                <SelectValue placeholder="Select your role" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {PLAYER_ROLES.map((role) => (
                                                    <SelectItem
                                                        key={role.value}
                                                        value={role.value}
                                                        className="cursor-pointer"
                                                    >
                                                        {role.label}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        {fieldState.invalid && (
                                            <FieldError errors={[fieldState.error]} />
                                        )}
                                    </Field>
                                )}
                            />

                            <Controller
                                name="name"
                                control={control}
                                render={({ field, fieldState }) => (
                                    <Field data-invalid={fieldState.invalid}>
                                        <FieldLabel htmlFor="name">Full Name</FieldLabel>
                                        <Input
                                            {...field}
                                            id="name"
                                            placeholder="Input your name"
                                            aria-invalid={fieldState.invalid}
                                            autoComplete="off"
                                            disabled={isSaving}
                                            className="border-2 border-black focus-visible:ring-red-600"
                                        />
                                        {fieldState.invalid && (
                                            <FieldError errors={[fieldState.error]} />
                                        )}
                                    </Field>
                                )}
                            />

                            {isMedicRole && (
                                <Controller
                                    name="certificate"
                                    control={control}
                                    render={({ field, fieldState }) => (
                                        <Field data-invalid={fieldState.invalid}>
                                            <FieldLabel htmlFor="certificate">
                                                Medic Certificate
                                            </FieldLabel>
                                            <UploadImage
                                                {...field}
                                                ratio={4 / 3}
                                                value={field.value}
                                                uploadUrl="/public-upload/image"
                                                deleteUrl="/public-upload/image"
                                                onChange={(value) => field.onChange(value ?? '')}
                                                onError={(error) =>
                                                    setError('certificate', {
                                                        type: 'manual',
                                                        message: typeof error === 'string' ? error : 'Upload failed',
                                                    })
                                                }
                                                className="border-2 border-black"
                                            />
                                            <FieldDescription>
                                                An admin will manually review this before your ID card can be scanned.
                                            </FieldDescription>
                                            {fieldState.invalid && (
                                                <FieldError errors={[fieldState.error]} />
                                            )}
                                        </Field>
                                    )}
                                />
                            )}

                            {isPlayerRole && (
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
                                                    placeholder="e.g. 23"
                                                    inputMode="numeric"
                                                    aria-invalid={fieldState.invalid}
                                                    autoComplete="off"
                                                    disabled={isSaving}
                                                    className="border-2 border-black focus-visible:ring-red-600"
                                                    onChange={(e) =>
                                                        field.onChange(
                                                            e.target.value.replace(/\D/g, '').slice(0, 3),
                                                        )
                                                    }
                                                />
                                                {fieldState.invalid && (
                                                    <FieldError errors={[fieldState.error]} />
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
                                                    placeholder="e.g. Point Guard"
                                                    aria-invalid={fieldState.invalid}
                                                    autoComplete="off"
                                                    disabled={isSaving}
                                                    className="border-2 border-black focus-visible:ring-red-600"
                                                />
                                                {fieldState.invalid && (
                                                    <FieldError errors={[fieldState.error]} />
                                                )}
                                            </Field>
                                        )}
                                    />
                                </FieldGroup>
                            )}

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
                                            className="border-2 border-black focus-visible:ring-red-600"
                                            onChange={(e) =>
                                                field.onChange(formatE164Input(e.target.value))
                                            }
                                        />
                                        <FieldDescription>
                                            Phone number in E.164 format, e.g. +628123456789
                                        </FieldDescription>
                                        {fieldState.invalid && (
                                            <FieldError errors={[fieldState.error]} />
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
                                            placeholder="you@example.com"
                                            aria-invalid={fieldState.invalid}
                                            autoComplete="off"
                                            disabled={isSaving}
                                            className="border-2 border-black focus-visible:ring-red-600"
                                        />
                                        {fieldState.invalid && (
                                            <FieldError errors={[fieldState.error]} />
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
                                                    type="button"
                                                    variant="outline"
                                                    aria-invalid={fieldState.invalid}
                                                    disabled={isSaving}
                                                    className={cn(
                                                        'w-full cursor-pointer justify-start border-2 border-black text-left font-normal',
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
                                            <PopoverContent className="w-auto p-0" align="start">
                                                <Calendar
                                                    mode="single"
                                                    selected={
                                                        field.value ? new Date(field.value) : undefined
                                                    }
                                                    onSelect={(date) =>
                                                        field.onChange(
                                                            date ? format(date, 'yyyy-MM-dd') : '',
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

                            <Button
                                type="submit"
                                className="mt-2 w-full cursor-pointer bg-red-600 font-bold tracking-wide text-white uppercase hover:bg-red-700"
                                disabled={isSaving}
                            >
                                {isSaving ? (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                ) : (
                                    <CheckCircle2 className="mr-2 h-4 w-4" />
                                )}
                                {isSaving ? 'Registering...' : 'Register'}
                            </Button>
                        </FieldGroup>
                    </form>
                </div>
            </div>
        </>
    );
}
