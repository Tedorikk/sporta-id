import { zodResolver } from '@hookform/resolvers/zod';
import { Head, router } from '@inertiajs/react';
import { CheckCircle2, Clock, Loader2, Lock, Star } from 'lucide-react';
import QRCode from 'qrcode';
import type { CSSProperties } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import * as z from 'zod';
import { RegistrationIdCardCard } from '@/components/id-card/registration-id-card-card';
import { TeamIdCardCard } from '@/components/id-card/team-id-card-card';
import { IdCardActions } from '@/components/id-card-actions';
import { PublicPageHeader } from '@/components/public/public-page-header';
import { SignaturePad } from '@/components/signature-pad';
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
import { formatRupiah } from '@/lib/format-currency';
import { loadSnapScript } from '@/lib/midtrans';
import type { CardTemplate } from '@/types/card-template';
import type { Event } from '@/types/event';
import type { Registration } from '@/types/registration';
import type { FormPage, RegistrationCategory, RegistrationField } from '@/types/registration-category';

interface Props {
    event: Event;
    registrationCategory: RegistrationCategory;
    registrationClosed: boolean;
    confirmedRegistration?: Registration | null;
    cardTemplate?: CardTemplate | null;
    snapToken?: string | null;
    midtransClientKey?: string | null;
    midtransIsProduction?: boolean;
}

function PaymentPendingView({
    event,
    registrationCategory,
    registration,
    snapToken,
    midtransClientKey,
    midtransIsProduction,
    accentStyle,
}: {
    event: Event;
    registrationCategory: Props['registrationCategory'];
    registration: Registration;
    snapToken: string | null;
    midtransClientKey: string | null;
    midtransIsProduction: boolean;
    accentStyle: CSSProperties;
}) {
    const [isPaying, setIsPaying] = useState(false);

    const payNow = () => {
        if (!snapToken || !midtransClientKey) {
            return;
        }

        setIsPaying(true);

        loadSnapScript(midtransClientKey, midtransIsProduction)
            .then(() => {
                window.snap?.pay(snapToken, {
                    onSuccess: () => router.visit(`/registrations/${registration.id}/status`),
                    onPending: () => router.visit(`/registrations/${registration.id}/status`),
                    onError: () => setIsPaying(false),
                    onClose: () => setIsPaying(false),
                });
            })
            .catch(() => setIsPaying(false));
    };

    return (
        <>
            <Head title={`Complete Payment — ${event.name}`} />

            <div
                className="relative flex min-h-screen flex-col items-center justify-center gap-6 bg-neutral-950 px-4 py-10"
                style={accentStyle}
            >
                <div className="flex items-center gap-2 text-amber-400">
                    <Clock className="h-5 w-5" />
                    <span className="text-sm font-semibold tracking-wide uppercase">Awaiting payment</span>
                </div>

                <div className="w-full max-w-sm overflow-hidden rounded-3xl border-2 border-black bg-white shadow-2xl">
                    <PublicPageHeader
                        eyebrow="Registration"
                        title={event.name}
                        subtitle={registrationCategory.name}
                        logoUrl={event.logo}
                        accentColor={event.accent_color}
                    />

                    <div className="flex flex-col items-center gap-4 px-6 py-10 text-center">
                        <p className="text-sm font-medium text-neutral-500">{registration.name}</p>
                        <p className="text-3xl font-bold text-neutral-900">{formatRupiah(registrationCategory.price)}</p>
                        <p className="text-sm text-neutral-600">
                            Your slot is reserved — complete payment to confirm this registration and get your ID card.
                        </p>

                        {snapToken ? (
                            <Button
                                type="button"
                                onClick={payNow}
                                disabled={isPaying}
                                className="mt-2 w-full cursor-pointer bg-[var(--accent)] font-bold tracking-wide text-white uppercase hover:bg-[var(--accent-dark)]"
                            >
                                {isPaying ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                {isPaying ? 'Opening payment…' : 'Pay Now'}
                            </Button>
                        ) : (
                            <p className="text-sm text-amber-600">
                                Couldn&apos;t start payment just now — use &quot;Check registration status&quot; below to try again.
                            </p>
                        )}
                    </div>
                </div>

                <a
                    href={`/registrations/${registration.id}/status`}
                    className="text-sm font-medium text-white/70 underline-offset-2 hover:text-white hover:underline"
                >
                    Check registration status
                </a>
            </div>
        </>
    );
}

function RegistrationSuccessView({
    event,
    registrationCategory,
    registration,
    cardTemplate,
    accentStyle,
    confirmationMessage,
}: {
    event: Event;
    registrationCategory: Props['registrationCategory'];
    registration: Registration;
    cardTemplate: CardTemplate | null;
    accentStyle: CSSProperties;
    confirmationMessage?: string | null;
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

                {confirmationMessage && (
                    <p className="max-w-sm text-center text-sm text-white/80">{confirmationMessage}</p>
                )}

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
const PHONE_REGEX = /^[0-9+\-\s()]{6,25}$/;

function allFieldsOf(pages: FormPage[]): RegistrationField[] {
    return pages.flatMap((page) => page.fields);
}

function buildSchema(pages: FormPage[]) {
    const fields = allFieldsOf(pages);
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
            if (f.key === 'name') {
                return;
            }

            const value = (data as Record<string, unknown>)[f.key];
            const isEmpty = f.type === 'checkbox' ? value !== true : typeof value !== 'string' || value.trim() === '';

            if (f.required && isEmpty) {
                ctx.addIssue({ code: 'custom', path: [f.key], message: f.error_message || `${f.label} is required` });

                return;
            }

            if (isEmpty || typeof value !== 'string') {
                return;
            }

            if (f.type === 'email' && !/^\S+@\S+\.\S+$/.test(value)) {
                ctx.addIssue({ code: 'custom', path: [f.key], message: 'Must be a valid email' });
            }

            if (f.type === 'phone' && !PHONE_REGEX.test(value)) {
                ctx.addIssue({ code: 'custom', path: [f.key], message: 'Must be a valid phone number' });
            }

            if (f.type === 'number') {
                if (!/^-?\d*\.?\d*$/.test(value)) {
                    ctx.addIssue({ code: 'custom', path: [f.key], message: 'Must be a number' });
                } else {
                    const numeric = Number(value);

                    if (f.min != null && numeric < f.min) {
                        ctx.addIssue({ code: 'custom', path: [f.key], message: `Must be at least ${f.min}` });
                    }

                    if (f.max != null && numeric > f.max) {
                        ctx.addIssue({ code: 'custom', path: [f.key], message: `Must be at most ${f.max}` });
                    }
                }
            }
        });
    });
}

function defaultValuesFor(pages: FormPage[]) {
    const defaults: Record<string, string | boolean> = { name: '' };

    allFieldsOf(pages).forEach((f) => {
        if (f.key === 'name') {
            return;
        }

        defaults[f.key] = f.type === 'checkbox' ? false : '';
    });

    return defaults;
}

function RatingInput({ value, onChange, max = 5, disabled }: { value: string; onChange: (value: string) => void; max?: number; disabled?: boolean }) {
    const selected = Number(value) || 0;

    return (
        <div className="flex items-center gap-1">
            {Array.from({ length: max }, (_, i) => i + 1).map((n) => (
                <button
                    key={n}
                    type="button"
                    disabled={disabled}
                    onClick={() => onChange(String(n))}
                    aria-label={`${n} star${n > 1 ? 's' : ''}`}
                    className="disabled:opacity-50"
                >
                    <Star className={n <= selected ? 'h-6 w-6 fill-[var(--accent)] text-[var(--accent)]' : 'h-6 w-6 text-neutral-300'} />
                </button>
            ))}
        </div>
    );
}

export default function RegisterDynamic({
    event,
    registrationCategory,
    registrationClosed,
    confirmedRegistration,
    cardTemplate,
    snapToken,
    midtransClientKey,
    midtransIsProduction,
}: Props) {
    useForceLightMode();

    const [isSaving, setIsSaving] = useState(false);
    const [pageIndex, setPageIndex] = useState(0);
    const [honeypot, setHoneypot] = useState('');
    const pages = useMemo(() => registrationCategory.form_pages ?? [], [registrationCategory.form_pages]);
    const branding = registrationCategory.form_branding ?? {};

    const schema = useMemo(() => buildSchema(pages), [pages]);
    type FormValues = z.infer<typeof schema>;

    const { control, handleSubmit, setError, trigger } = useForm<FormValues>({
        resolver: zodResolver(schema),
        defaultValues: defaultValuesFor(pages) as FormValues,
        mode: 'onChange',
    });

    const isTeam = registrationCategory.subject_type === 'team';
    const { accent, accentDark } = accentColors(event.accent_color);
    const radiusValue = branding.border_radius === 'sharp' ? '2px' : branding.border_radius === 'pill' ? '9999px' : branding.border_radius === 'rounded' ? '0.75rem' : undefined;
    const accentStyle = {
        '--accent': branding.primary_color || accent,
        '--accent-dark': branding.secondary_color || accentDark,
        ...(branding.font_family ? { fontFamily: branding.font_family } : {}),
    } as CSSProperties;
    const controlStyle: CSSProperties = radiusValue ? { borderRadius: radiusValue } : {};
    const cardStyle: CSSProperties = {
        ...(branding.background_color ? { backgroundColor: branding.background_color } : {}),
        ...(branding.text_color ? { color: branding.text_color } : {}),
    };

    const currentPage = pages[pageIndex];
    const isLastPage = pageIndex === pages.length - 1;
    const isFirstPage = pageIndex === 0;

    const onSubmit = (data: FormValues) => {
        setIsSaving(true);

        const raw = data as Record<string, string | boolean>;
        const payload: Record<string, string | boolean | Record<string, string | boolean>> = {
            name: raw.name,
            form_data: {},
            website: honeypot,
        };
        const formData = payload.form_data as Record<string, string | boolean>;

        allFieldsOf(pages).forEach((f) => {
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

    async function goNext() {
        if (!currentPage) {
            return;
        }

        const keys = currentPage.fields.filter((f) => f.key !== 'name').map((f) => f.key) as never[];
        const namesToCheck = pageIndex === 0 ? (['name', ...keys] as never[]) : keys;
        const valid = await trigger(namesToCheck);

        if (valid) {
            setPageIndex((i) => Math.min(i + 1, pages.length - 1));
        }
    }

    if (confirmedRegistration?.status === 'pending_payment') {
        return (
            <PaymentPendingView
                event={event}
                registrationCategory={registrationCategory}
                registration={confirmedRegistration}
                snapToken={snapToken ?? null}
                midtransClientKey={midtransClientKey ?? null}
                midtransIsProduction={midtransIsProduction ?? false}
                accentStyle={accentStyle}
            />
        );
    }

    if (confirmedRegistration) {
        return (
            <RegistrationSuccessView
                event={event}
                registrationCategory={registrationCategory}
                registration={confirmedRegistration}
                cardTemplate={cardTemplate ?? null}
                accentStyle={accentStyle}
                confirmationMessage={registrationCategory.form_settings?.confirmation_message}
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
                <div className="relative z-10 w-full max-w-md overflow-hidden rounded-3xl border-2 border-black bg-white shadow-2xl" style={cardStyle}>
                    <PublicPageHeader
                        eyebrow="Registration"
                        title={event.name}
                        subtitle={registrationCategory.name}
                        logoUrl={branding.logo_url || event.logo}
                        accentColor={event.accent_color}
                    />

                    {pages.length > 1 && (
                        <div className="px-6 pt-4">
                            <div className="flex items-center justify-between text-xs font-medium text-neutral-500">
                                <span>
                                    Step {pageIndex + 1} of {pages.length}
                                </span>
                                <span>{currentPage?.title}</span>
                            </div>
                            <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-neutral-200">
                                <div
                                    className="h-full bg-[var(--accent)] transition-all"
                                    style={{ width: `${((pageIndex + 1) / pages.length) * 100}%` }}
                                />
                            </div>
                        </div>
                    )}

                    <form onSubmit={handleSubmit(onSubmit)} className="px-6 py-6">
                        {/* Honeypot — hidden from real visitors, a filled value is a strong bot signal. */}
                        <input
                            value={honeypot}
                            onChange={(e) => setHoneypot(e.target.value)}
                            type="text"
                            name="website"
                            tabIndex={-1}
                            autoComplete="off"
                            className="absolute -left-[9999px] h-0 w-0 opacity-0"
                            aria-hidden="true"
                        />

                        <FieldGroup>
                            {isFirstPage && (
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
                                                style={controlStyle}
                                                className="border-2 border-black focus-visible:ring-[var(--accent)]"
                                            />
                                            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                                        </Field>
                                    )}
                                />
                            )}

                            {(currentPage?.fields ?? [])
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
                                                ) : f.type === 'signature' ? (
                                                    <SignaturePad
                                                        value={field.value as string}
                                                        disabled={isSaving}
                                                        onChange={(value) => field.onChange(value ?? '')}
                                                        onError={(error) => setError(f.key as never, { type: 'manual', message: error })}
                                                    />
                                                ) : f.type === 'rating' ? (
                                                    <RatingInput
                                                        value={field.value as string}
                                                        onChange={field.onChange}
                                                        max={f.max_rating ?? 5}
                                                        disabled={isSaving}
                                                    />
                                                ) : f.type === 'textarea' ? (
                                                    <Textarea
                                                        {...field}
                                                        id={f.key}
                                                        value={field.value as string}
                                                        disabled={isSaving}
                                                        style={controlStyle}
                                                        className="border-2 border-black focus-visible:ring-[var(--accent)]"
                                                    />
                                                ) : f.type === 'select' ? (
                                                    <Select value={field.value as string} onValueChange={field.onChange} disabled={isSaving}>
                                                        <SelectTrigger
                                                            id={f.key}
                                                            style={controlStyle}
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
                                                        style={controlStyle}
                                                        className="border-2 border-black focus-visible:ring-[var(--accent)]"
                                                    />
                                                )}

                                                {f.help_text && f.type !== 'checkbox' && <FieldDescription>{f.help_text}</FieldDescription>}
                                                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                                            </Field>
                                        )}
                                    />
                                ))}

                            <div className="mt-2 flex gap-2">
                                {!isFirstPage && (
                                    <Button
                                        type="button"
                                        variant="outline"
                                        className="flex-1 cursor-pointer"
                                        onClick={() => setPageIndex((i) => Math.max(i - 1, 0))}
                                        disabled={isSaving}
                                        style={controlStyle}
                                    >
                                        Back
                                    </Button>
                                )}

                                {isLastPage ? (
                                    <Button
                                        type="submit"
                                        className="flex-1 cursor-pointer bg-[var(--accent)] font-bold tracking-wide text-white uppercase hover:bg-[var(--accent-dark)]"
                                        disabled={isSaving}
                                        style={controlStyle}
                                    >
                                        {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                                        {isSaving ? 'Registering...' : branding.button_label || 'Register'}
                                    </Button>
                                ) : (
                                    <Button
                                        type="button"
                                        className="flex-1 cursor-pointer bg-[var(--accent)] font-bold tracking-wide text-white uppercase hover:bg-[var(--accent-dark)]"
                                        onClick={goNext}
                                        style={controlStyle}
                                    >
                                        Next
                                    </Button>
                                )}
                            </div>
                        </FieldGroup>
                    </form>
                </div>
            </div>
        </>
    );
}
