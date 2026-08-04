import { zodResolver } from '@hookform/resolvers/zod';
import { Head, router } from '@inertiajs/react';
import { CheckCircle2, Loader2, Lock } from 'lucide-react';
import QRCode from 'qrcode';
import type { CSSProperties } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import * as z from 'zod';
import { RegistrationIdCardCard } from '@/components/id-card/registration-id-card-card';
import { TeamIdCardCard } from '@/components/id-card/team-id-card-card';
import { IdCardActions } from '@/components/id-card-actions';
import { PublicPageHeader } from '@/components/public/public-page-header';
import { Button } from '@/components/ui/button';
import {
    Field,
    FieldDescription,
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
import { Textarea } from '@/components/ui/textarea';
import { UploadDocument } from '@/components/upload-document';
import { UploadImage } from '@/components/upload-image';
import { useForceLightMode } from '@/hooks/use-force-light-mode';
import { accentColors } from '@/lib/color';
import type { CardTemplate } from '@/types/card-template';
import type { Event } from '@/types/event';
import type { Registration } from '@/types/registration';
import type { RegistrationCategory, RegistrationField } from '@/types/registration-category';

interface Props {
    event: Event;
    registrationCategory: RegistrationCategory;
    registrationClosed: boolean;
    confirmedRegistration?: Registration | null;
    cardTemplate?: CardTemplate | null;
}

function RegistrationSuccessView({
    event,
    registrationCategory,
    registration,
    cardTemplate,
    accentStyle,
}: {
    event: Event;
    registrationCategory: RegistrationCategory;
    registration: Registration;
    cardTemplate: CardTemplate | null;
    accentStyle: CSSProperties;
}) {
    const cardRef = useRef<HTMLDivElement>(null);
    const [qrDataUrl, setQrDataUrl] = useState('');
    const team = registration.team ?? null;

    const idCardUrl = team
        ? `${window.location.origin}/teams/${team.id}/id-card`
        : `${window.location.origin}/registrations/${registration.id}/id-card`;

    useEffect(() => {
        QRCode.toDataURL(idCardUrl, {
            width: 280,
            margin: 1,
            color: { dark: '#1a1a2e', light: '#ffffff' },
            errorCorrectionLevel: 'H',
        }).then(setQrDataUrl);
    }, [idCardUrl]);

    return (
        <>
            <Head title={`Registered — ${event.name}`} />

            <div
                className="relative flex min-h-screen flex-col items-center justify-center gap-6 bg-neutral-950 px-4 py-10"
                style={accentStyle}
            >
                <div className="flex items-center gap-2 text-emerald-400">
                    <CheckCircle2 className="h-5 w-5" />
                    <span className="text-sm font-semibold tracking-wide uppercase">Registration confirmed</span>
                </div>

                {team ? (
                    <TeamIdCardCard team={team} qrDataUrl={qrDataUrl} cardRef={cardRef} />
                ) : cardTemplate ? (
                    <RegistrationIdCardCard registration={registration} template={cardTemplate} qrDataUrl={qrDataUrl} cardRef={cardRef} />
                ) : null}

                <IdCardActions
                    targetRef={cardRef}
                    fileName={`${registration.name}-id-card`}
                    shareTitle={`${registration.name} — ${registrationCategory.name} ID Card`}
                    shareUrl={idCardUrl}
                />

                <a
                    href={`/events/${event.id}/registration-categories/${registrationCategory.id}/register`}
                    className="text-sm font-medium text-white/70 underline-offset-2 hover:text-white hover:underline"
                >
                    Register another
                </a>
            </div>
        </>
    );
}

const RESERVED_KEYS = ['name', 'email', 'phone', 'photo'];

function buildSchema(fields: RegistrationField[]) {
    const shape: Record<string, z.ZodTypeAny> = {
        name: z.string().min(1, 'Input a name').max(255),
    };

    fields.forEach((f) => {
        if (f.key === 'name') {
            return;
        }

        shape[f.key] = f.type === 'checkbox' ? z.boolean() : z.string();
    });

    return z.object(shape).superRefine((data, ctx) => {
        fields.forEach((f) => {
            if (f.key === 'name' || !f.required) {
                return;
            }

            const value = (data as Record<string, unknown>)[f.key];

            const isEmpty = f.type === 'checkbox' ? value !== true : typeof value !== 'string' || value.trim() === '';

            if (isEmpty) {
                ctx.addIssue({ code: 'custom', path: [f.key], message: `${f.label} is required` });
            }

            if (f.type === 'email' && typeof value === 'string' && value && !/^\S+@\S+\.\S+$/.test(value)) {
                ctx.addIssue({ code: 'custom', path: [f.key], message: 'Must be a valid email' });
            }

            if (f.type === 'number' && typeof value === 'string' && value && !/^\d*\.?\d*$/.test(value)) {
                ctx.addIssue({ code: 'custom', path: [f.key], message: 'Must be a number' });
            }
        });
    });
}

function defaultValuesFor(fields: RegistrationField[]) {
    const defaults: Record<string, string | boolean> = { name: '' };

    fields.forEach((f) => {
        if (f.key === 'name') {
            return;
        }

        defaults[f.key] = f.type === 'checkbox' ? false : '';
    });

    return defaults;
}

export default function RegisterDynamic({ event, registrationCategory, registrationClosed, confirmedRegistration, cardTemplate }: Props) {
    useForceLightMode();

    const [isSaving, setIsSaving] = useState(false);
    const fields = useMemo(() => registrationCategory.form_schema ?? [], [registrationCategory.form_schema]);

    const schema = useMemo(() => buildSchema(fields), [fields]);
    type FormValues = z.infer<typeof schema>;

    const { control, handleSubmit, setError } = useForm<FormValues>({
        resolver: zodResolver(schema),
        defaultValues: defaultValuesFor(fields) as FormValues,
        mode: 'onChange',
    });

    const isTeam = registrationCategory.subject_type === 'team';
    const { accent, accentDark } = accentColors(event.accent_color);
    const accentStyle = { '--accent': accent, '--accent-dark': accentDark } as CSSProperties;

    const onSubmit = (data: FormValues) => {
        setIsSaving(true);

        const raw = data as Record<string, string | boolean>;
        const payload: Record<string, string | boolean | Record<string, string | boolean>> = { name: raw.name, form_data: {} };
        const formData = payload.form_data as Record<string, string | boolean>;

        fields.forEach((f) => {
            if (f.key === 'name') {
                return;
            }

            if (RESERVED_KEYS.includes(f.key)) {
                payload[f.key] = raw[f.key];
            } else {
                formData[f.key] = raw[f.key];
            }
        });

        router.post(`/events/${event.id}/registration-categories/${registrationCategory.id}/register`, payload, {
            onFinish: () => setIsSaving(false),
            onError: (errors) => {
                Object.entries(errors).forEach(([field, message]) => {
                    const key = field.replace(/^form_data\./, '');
                    setError(key as never, { type: 'manual', message: message as string });
                });
            },
        });
    };

    if (confirmedRegistration) {
        return (
            <RegistrationSuccessView
                event={event}
                registrationCategory={registrationCategory}
                registration={confirmedRegistration}
                cardTemplate={cardTemplate ?? null}
                accentStyle={accentStyle}
            />
        );
    }

    if (registrationClosed) {
        return (
            <>
                <Head title={`Registration Closed — ${event.name}`} />

                <div className="relative flex min-h-screen items-center justify-center bg-neutral-950 px-4 py-10" style={accentStyle}>
                    <div className="relative z-10 w-full max-w-md overflow-hidden rounded-3xl border-2 border-black bg-white shadow-2xl">
                        <PublicPageHeader
                            eyebrow="Registration"
                            title={event.name}
                            subtitle={registrationCategory.name}
                            logoUrl={event.logo}
                            accentColor={event.accent_color}
                        />

                        <div className="flex flex-col items-center gap-4 px-6 py-14 text-center">
                            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
                                <Lock className="h-8 w-8 text-red-600" />
                            </div>
                            <p className="text-neutral-600">
                                Registration for this category is currently closed or full. Please contact the organizer for more
                                information.
                            </p>
                            {event.contact_person && (
                                <p className="text-sm font-medium text-neutral-500">Contact: {event.contact_person}</p>
                            )}
                        </div>
                    </div>
                </div>
            </>
        );
    }

    return (
        <>
            <Head title={`${registrationCategory.name} Registration — ${event.name}`} />

            <div className="relative flex min-h-screen items-center justify-center bg-neutral-950 px-4 py-10" style={accentStyle}>
                <div className="relative z-10 w-full max-w-md overflow-hidden rounded-3xl border-2 border-black bg-white shadow-2xl">
                    <PublicPageHeader
                        eyebrow="Registration"
                        title={event.name}
                        subtitle={registrationCategory.name}
                        logoUrl={event.logo}
                        accentColor={event.accent_color}
                    />

                    <form onSubmit={handleSubmit(onSubmit)} className="px-6 py-6">
                        <FieldGroup>
                            <Controller
                                name={'name' as never}
                                control={control}
                                render={({ field, fieldState }) => (
                                    <Field data-invalid={fieldState.invalid}>
                                        <FieldLabel htmlFor="name">{isTeam ? 'Team Name' : 'Full Name'}</FieldLabel>
                                        <Input
                                            {...field}
                                            id="name"
                                            placeholder={isTeam ? "Input your team's name" : 'Input your name'}
                                            aria-invalid={fieldState.invalid}
                                            autoComplete="off"
                                            disabled={isSaving}
                                            className="border-2 border-black focus-visible:ring-[var(--accent)]"
                                        />
                                        {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                                    </Field>
                                )}
                            />

                            {fields
                                .filter((f) => f.key !== 'name')
                                .map((f) => (
                                    <Controller
                                        key={f.key}
                                        name={f.key as never}
                                        control={control}
                                        render={({ field, fieldState }) => (
                                            <Field data-invalid={fieldState.invalid}>
                                                <FieldLabel htmlFor={f.key}>
                                                    {f.label}
                                                    {!f.required && (
                                                        <span className="font-normal text-muted-foreground"> (Optional)</span>
                                                    )}
                                                </FieldLabel>

                                                {f.type === 'file' ? (
                                                    <UploadImage
                                                        value={field.value as string}
                                                        ratio={4 / 5}
                                                        uploadUrl="/public-upload/image"
                                                        deleteUrl="/public-upload/image"
                                                        onChange={(value) => field.onChange(value ?? '')}
                                                        onError={(error) =>
                                                            setError(f.key as never, {
                                                                type: 'manual',
                                                                message: typeof error === 'string' ? error : 'Upload failed',
                                                            })
                                                        }
                                                        enableCrop
                                                        className="rounded-2xl border-2 border-black"
                                                    />
                                                ) : f.type === 'document' ? (
                                                    <UploadDocument
                                                        value={field.value as string}
                                                        uploadUrl="/public-upload/document"
                                                        deleteUrl="/public-upload/document"
                                                        onChange={(value) => field.onChange(value ?? '')}
                                                        onError={(error) =>
                                                            setError(f.key as never, {
                                                                type: 'manual',
                                                                message: typeof error === 'string' ? error : 'Upload failed',
                                                            })
                                                        }
                                                        className="rounded-2xl border-2 border-black"
                                                    />
                                                ) : f.type === 'textarea' ? (
                                                    <Textarea
                                                        {...field}
                                                        id={f.key}
                                                        value={field.value as string}
                                                        disabled={isSaving}
                                                        className="border-2 border-black focus-visible:ring-[var(--accent)]"
                                                    />
                                                ) : f.type === 'select' ? (
                                                    <Select value={field.value as string} onValueChange={field.onChange} disabled={isSaving}>
                                                        <SelectTrigger
                                                            id={f.key}
                                                            className="w-full cursor-pointer border-2 border-black font-semibold focus-visible:ring-[var(--accent)]"
                                                        >
                                                            <SelectValue placeholder="Select an option" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {(f.options ?? []).map((option) => (
                                                                <SelectItem key={option} value={option} className="cursor-pointer">
                                                                    {option}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                ) : f.type === 'radio' ? (
                                                    <div className="flex flex-wrap gap-4">
                                                        {(f.options ?? []).map((option) => (
                                                            <label key={option} className="flex items-center gap-2 text-sm">
                                                                <input
                                                                    type="radio"
                                                                    name={f.key}
                                                                    value={option}
                                                                    checked={field.value === option}
                                                                    onChange={() => field.onChange(option)}
                                                                    disabled={isSaving}
                                                                />
                                                                {option}
                                                            </label>
                                                        ))}
                                                    </div>
                                                ) : f.type === 'checkbox' ? (
                                                    <label className="flex items-center gap-2 text-sm">
                                                        <input
                                                            type="checkbox"
                                                            checked={field.value as boolean}
                                                            onChange={(e) => field.onChange(e.target.checked)}
                                                            disabled={isSaving}
                                                        />
                                                        {f.help_text ?? 'Yes'}
                                                    </label>
                                                ) : (
                                                    <Input
                                                        {...field}
                                                        id={f.key}
                                                        value={field.value as string}
                                                        type={f.type === 'date' ? 'date' : f.type === 'number' ? 'text' : f.type === 'email' ? 'email' : 'text'}
                                                        inputMode={f.type === 'number' ? 'decimal' : undefined}
                                                        aria-invalid={fieldState.invalid}
                                                        autoComplete="off"
                                                        disabled={isSaving}
                                                        className="border-2 border-black focus-visible:ring-[var(--accent)]"
                                                    />
                                                )}

                                                {f.help_text && f.type !== 'checkbox' && <FieldDescription>{f.help_text}</FieldDescription>}
                                                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                                            </Field>
                                        )}
                                    />
                                ))}

                            <Button
                                type="submit"
                                className="mt-2 w-full cursor-pointer bg-[var(--accent)] font-bold tracking-wide text-white uppercase hover:bg-[var(--accent-dark)]"
                                disabled={isSaving}
                            >
                                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                                {isSaving ? 'Registering...' : 'Register'}
                            </Button>
                        </FieldGroup>
                    </form>
                </div>
            </div>
        </>
    );
}
