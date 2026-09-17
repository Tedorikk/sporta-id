import { zodResolver } from '@hookform/resolvers/zod';
import { Head, router } from '@inertiajs/react';
import {
    CheckCircle2,
    Clock,
    Loader2,
    Lock,
    Save,
    Users,
} from 'lucide-react';
import QRCode from 'qrcode';
import type { CSSProperties } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import * as z from 'zod';
import { RegistrationIdCardCard } from '@/components/id-card/registration-id-card-card';
import { TeamIdCardCard } from '@/components/id-card/team-id-card-card';
import { IdCardActions } from '@/components/id-card-actions';
import {
    BooleanChoice,
    ChoiceGroup,
    DescriptionBlock,
    GenderChoice,
    RatingInput,
} from '@/components/public/dynamic-field-controls';
import { PayLinkShare } from '@/components/public/pay-link-share';
import { PublicPageHeader } from '@/components/public/public-page-header';
import { RequiredMark } from '@/components/public/required-mark';
import {
    RosterBlock,
    defaultRoster,
    rosterSchema,
} from '@/components/public/roster-block';
import { RosterRequirementsCard } from '@/components/public/roster-requirements-card';
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
import { useT } from '@/hooks/use-t';
import { accentColors } from '@/lib/color';
import { formatRupiah } from '@/lib/format-currency';
import { formatDateTime } from '@/lib/format-date';
import type { Translate } from '@/lib/i18n';
import { loadSnapScript } from '@/lib/midtrans';
import {
    clearDraft,
    draftKey,
    readDraft,
    sameAsDefaults,
    writeDraft,
} from '@/lib/registration-draft';
import type { CardTemplate } from '@/types/card-template';
import type { Event } from '@/types/event';
import type { Registration } from '@/types/registration';
import type {
    FormPage,
    RegistrationCategory,
    RegistrationField,
} from '@/types/registration-category';
import {
    imageRatioOf,
    isInputField,
    isRosterField,
} from '@/types/registration-category';

interface Props {
    event: Event;
    registrationCategory: RegistrationCategory;
    registrationClosed: boolean;
    confirmedRegistration?: Registration | null;
    /** When roster edits close, for team forms with a roster block. */
    rosterDeadline?: string | null;
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
    const { t } = useT();
    const [isPaying, setIsPaying] = useState(false);

    const payNow = () => {
        if (!snapToken || !midtransClientKey) {
            return;
        }

        setIsPaying(true);

        loadSnapScript(midtransClientKey, midtransIsProduction)
            .then(() => {
                window.snap?.pay(snapToken, {
                    onSuccess: () =>
                        router.visit(
                            `/registrations/${registration.qr_token}/status`,
                        ),
                    onPending: () =>
                        router.visit(
                            `/registrations/${registration.qr_token}/status`,
                        ),
                    onError: () => setIsPaying(false),
                    onClose: () => setIsPaying(false),
                });
            })
            .catch(() => setIsPaying(false));
    };

    return (
        <>
            <Head
                title={t('Complete Payment — :event', { event: event.name })}
            />

            <div
                className="relative flex min-h-screen flex-col items-center justify-center gap-6 bg-paper px-4 py-10"
                style={accentStyle}
            >
                <div className="flex items-center gap-2 text-amber-400">
                    <Clock className="h-5 w-5" />
                    <span className="text-sm font-semibold tracking-wide uppercase">
                        {t('Awaiting payment')}
                    </span>
                </div>

                <div className="w-full max-w-sm overflow-hidden rounded-2xl border border-ink/10 bg-paper">
                    <PublicPageHeader
                        eyebrow={t('Registration')}
                        title={event.name}
                        subtitle={registrationCategory.name}
                        logoUrl={event.logo}
                        accentColor={event.accent_color}
                    />

                    <div className="flex flex-col items-center gap-4 px-6 py-10 text-center">
                        <p className="text-sm font-medium text-neutral-500">
                            {registration.name}
                        </p>
                        <p className="text-3xl font-bold text-neutral-900">
                            {formatRupiah(registrationCategory.price)}
                        </p>
                        <p className="text-sm text-neutral-600">
                            {t(
                                'Your slot is reserved — complete payment to confirm this registration and get your ID card.',
                            )}
                        </p>

                        {snapToken ? (
                            <Button
                                type="button"
                                onClick={payNow}
                                disabled={isPaying}
                                className="mt-2 w-full cursor-pointer bg-[var(--accent)] font-bold tracking-wide text-white uppercase hover:bg-[var(--accent-dark)]"
                            >
                                {isPaying ? (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                ) : null}
                                {isPaying
                                    ? t('Opening payment…')
                                    : t('Pay Now')}
                            </Button>
                        ) : (
                            <p className="text-sm text-amber-600">
                                {t(
                                    'Couldn’t start payment just now — use "Check registration status" below to try again.',
                                )}
                            </p>
                        )}

                        <PayLinkShare
                            qrToken={registration.qr_token}
                            expiresAt={registration.expires_at}
                            message={t(
                                'Please pay the registration fee of :price for :name (:category — :event) here:',
                                {
                                    price: formatRupiah(
                                        registrationCategory.price,
                                    ),
                                    name: registration.name,
                                    category: registrationCategory.name,
                                    event: event.name,
                                },
                            )}
                        />
                    </div>
                </div>

                <a
                    href={`/registrations/${registration.qr_token}/status`}
                    className="text-sm font-medium text-ink/70 underline-offset-2 hover:text-ink hover:underline"
                >
                    {t('Check registration status')}
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
    const { t } = useT();
    const cardRef = useRef<HTMLDivElement>(null);
    const [qrDataUrl, setQrDataUrl] = useState('');
    const team = registration.team ?? null;

    const idCardUrl = team
        ? `${window.location.origin}/teams/${team.id}/id-card`
        : `${window.location.origin}/registrations/${registration.qr_token}/id-card`;

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
            <Head title={t('Registered — :event', { event: event.name })} />

            <div
                className="relative flex min-h-screen flex-col items-center justify-center gap-6 bg-paper px-4 py-10"
                style={accentStyle}
            >
                <div className="flex items-center gap-2 text-emerald-400">
                    <CheckCircle2 className="h-5 w-5" />
                    <span className="text-sm font-semibold tracking-wide uppercase">
                        {t('Registration confirmed')}
                    </span>
                </div>

                {confirmationMessage && (
                    <p className="max-w-sm text-center text-sm text-ink/80">
                        {confirmationMessage}
                    </p>
                )}

                {team ? (
                    <TeamIdCardCard
                        team={team}
                        qrDataUrl={qrDataUrl}
                        cardRef={cardRef}
                    />
                ) : cardTemplate ? (
                    <RegistrationIdCardCard
                        registration={registration}
                        template={cardTemplate}
                        qrDataUrl={qrDataUrl}
                        cardRef={cardRef}
                    />
                ) : null}

                <IdCardActions
                    targetRef={cardRef}
                    fileName={`${registration.name}-id-card`}
                    shareTitle={t(':name — :category ID Card', {
                        name: registration.name,
                        category: registrationCategory.name,
                    })}
                    shareUrl={idCardUrl}
                />

                {team?.basketball_event_category_id && (
                    <div className="flex w-full max-w-sm flex-col items-center gap-2 rounded-2xl border border-ink/15 bg-ink/5 p-4 text-center">
                        <p className="text-sm text-ink/80">
                            {t(
                                'Next, open the roster: send each member their personal link so they fill in their own details, or complete them yourself. Keep the link — it is how you get back to the roster.',
                            )}
                        </p>
                        <Button
                            asChild
                            className="w-full bg-[var(--accent)] font-bold tracking-wide text-white uppercase hover:bg-[var(--accent-dark)]"
                        >
                            <a
                                href={`/registrations/${registration.qr_token}/roster`}
                            >
                                <Users className="mr-2 h-4 w-4" />
                                {t('Add your roster')}
                            </a>
                        </Button>
                    </div>
                )}

                <a
                    href={`/events/${event.id}/registration-categories/${registrationCategory.id}/register`}
                    className="text-sm font-medium text-ink/70 underline-offset-2 hover:text-ink hover:underline"
                >
                    {t('Register another')}
                </a>
            </div>
        </>
    );
}

const RESERVED_KEYS = ['name', 'email', 'phone', 'photo'];

/**
 * Injected into a paid category's form when the organizer didn't ask for an
 * email themselves. A paid registration has nowhere to send the Midtrans
 * receipt or our confirmation without one, and the server enforces the same
 * rule — so the field has to exist even if the form builder omitted it.
 */
const emailField = (t: Translate): RegistrationField => ({
    key: 'email',
    label: t('Email Address'),
    type: 'email',
    required: true,
    help_text: t(
        'Your payment receipt and registration confirmation are sent here.',
    ),
});

function withRequiredEmail(
    pages: FormPage[],
    isPaid: boolean,
    t: Translate,
): FormPage[] {
    if (
        !isPaid ||
        pages.some((page) =>
            (page.fields ?? []).some((field) => field.key === 'email'),
        )
    ) {
        return pages;
    }

    if (pages.length === 0) {
        return [
            { key: 'contact', title: t('Contact'), fields: [emailField(t)] },
        ];
    }

    const [first, ...rest] = pages;

    return [
        { ...first, fields: [...(first.fields ?? []), emailField(t)] },
        ...rest,
    ];
}
const PHONE_REGEX = /^[0-9+\-\s()]{6,25}$/;

/**
 * Every field that actually collects an answer. Description blocks live in
 * `page.fields` for ordering, but have no value to validate, default or send.
 */
function inputFieldsOf(pages: FormPage[]): RegistrationField[] {
    return pages.flatMap((page) => page.fields.filter(isInputField));
}

function rosterFieldOf(pages: FormPage[]): RegistrationField | undefined {
    return pages.flatMap((page) => page.fields).find(isRosterField);
}

/** Which page a field key lives on, so a cross-page error can jump there first. */
function pageIndexOf(pages: FormPage[], key: string): number {
    return pages.findIndex((page) =>
        page.fields.some((f) =>
            key === 'roster' ? isRosterField(f) : f.key === key,
        ),
    );
}

/** Radio/gender choices only tag their `<input>`s with `name`, not `id`. */
function scrollToField(key: string) {
    const el =
        document.getElementById(key) ??
        document.querySelector<HTMLElement>(`[name="${key}"]`);
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    el?.focus?.({ preventScroll: true });
}

function buildSchema(pages: FormPage[], t: Translate) {
    const fields = inputFieldsOf(pages);
    const shape: Record<string, z.ZodTypeAny> = {
        name: z.string().min(1, t('Input a name')).max(255),
    };

    fields.forEach((f) => {
        if (f.key === 'name') {
            return;
        }

        shape[f.key] = f.type === 'checkbox' ? z.boolean() : z.string();
    });

    const roster = rosterFieldOf(pages);

    if (roster) {
        shape.roster = rosterSchema(roster, t);
    }

    return z.object(shape).superRefine((data, ctx) => {
        fields.forEach((f) => {
            if (f.key === 'name') {
                return;
            }

            const value = (data as Record<string, unknown>)[f.key];
            const isEmpty =
                f.type === 'checkbox'
                    ? value !== true
                    : typeof value !== 'string' || value.trim() === '';

            if (f.required && isEmpty) {
                ctx.addIssue({
                    code: 'custom',
                    path: [f.key],
                    message:
                        f.error_message ||
                        t(':label is required', { label: f.label }),
                });

                return;
            }

            if (isEmpty || typeof value !== 'string') {
                return;
            }

            if (f.type === 'email' && !/^\S+@\S+\.\S+$/.test(value)) {
                ctx.addIssue({
                    code: 'custom',
                    path: [f.key],
                    message: t('Must be a valid email'),
                });
            }

            if (f.type === 'phone' && !PHONE_REGEX.test(value)) {
                ctx.addIssue({
                    code: 'custom',
                    path: [f.key],
                    message: t('Must be a valid phone number'),
                });
            }

            if (f.type === 'number') {
                if (!/^-?\d*\.?\d*$/.test(value)) {
                    ctx.addIssue({
                        code: 'custom',
                        path: [f.key],
                        message: t('Must be a number'),
                    });
                } else {
                    const numeric = Number(value);

                    if (f.min != null && numeric < f.min) {
                        ctx.addIssue({
                            code: 'custom',
                            path: [f.key],
                            message: t('Must be at least :min', { min: f.min }),
                        });
                    }

                    if (f.max != null && numeric > f.max) {
                        ctx.addIssue({
                            code: 'custom',
                            path: [f.key],
                            message: t('Must be at most :max', { max: f.max }),
                        });
                    }
                }
            }
        });
    });
}

function defaultValuesFor(pages: FormPage[]) {
    const defaults: Record<string, unknown> = { name: '' };

    inputFieldsOf(pages).forEach((f) => {
        if (f.key === 'name') {
            return;
        }

        defaults[f.key] = f.type === 'checkbox' ? false : '';
    });

    const roster = rosterFieldOf(pages);

    if (roster) {
        defaults.roster = defaultRoster(roster);
    }

    return defaults;
}

export default function RegisterDynamic({
    event,
    registrationCategory,
    registrationClosed,
    confirmedRegistration,
    rosterDeadline = null,
    cardTemplate,
    snapToken,
    midtransClientKey,
    midtransIsProduction,
}: Props) {
    useForceLightMode();

    const { t, locale } = useT();
    const [isSaving, setIsSaving] = useState(false);
    const [pageIndex, setPageIndex] = useState(0);
    const [honeypot, setHoneypot] = useState('');
    const pages = useMemo(
        () =>
            withRequiredEmail(
                registrationCategory.form_pages ?? [],
                Boolean(registrationCategory.price) &&
                    Number(registrationCategory.price) > 0,
                t,
            ),
        [registrationCategory.form_pages, registrationCategory.price, t],
    );
    const branding = registrationCategory.form_branding ?? {};

    const schema = useMemo(() => buildSchema(pages, t), [pages, t]);
    type FormValues = z.infer<typeof schema>;

    const {
        control,
        handleSubmit,
        setError,
        trigger,
        subscribe,
        getValues,
        getFieldState,
        reset,
        formState: { errors },
    } = useForm<FormValues>({
        resolver: zodResolver(schema),
        defaultValues: defaultValuesFor(pages) as FormValues,
        mode: 'onChange',
    });
    const rosterField = rosterFieldOf(pages);

    // --- Draft: what's typed so far lives in localStorage ------------------
    // Restored silently on mount (one less tap on a phone); the banner says
    // so and offers a clean start. Saving is off until the restore has run,
    // so an empty first render can't overwrite the draft, and off for good
    // once the registration went through.
    const storageKey = draftKey(registrationCategory.id);
    const [restoredAt, setRestoredAt] = useState<string | null>(null);
    // When the draft was last written — shown so the manager knows a
    // refresh or a phone call won't cost them the form.
    const [savedAt, setSavedAt] = useState<string | null>(null);
    const draftEnabled = useRef(false);
    const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        if (confirmedRegistration) {
            draftEnabled.current = false;
            clearDraft(storageKey);

            return;
        }

        const draft = readDraft<Record<string, unknown>>(storageKey);
        const defaults = defaultValuesFor(pages);

        if (draft && !sameAsDefaults(draft.values, defaults)) {
            // Over the defaults, so a question the organiser added since
            // still gets its empty value. A one-shot sync from storage on
            // mount, not a render-time derivation — hence the setState here.
            reset({ ...defaults, ...draft.values } as FormValues);
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setPageIndex(Math.min(draft.pageIndex, pages.length - 1));
            setRestoredAt(draft.savedAt);
        }

        draftEnabled.current = true;
        // The key only changes with the category, which means a new page.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [storageKey, Boolean(confirmedRegistration)]);

    useEffect(() => {
        const save = () => {
            if (!draftEnabled.current) {
                return;
            }

            const now = new Date().toISOString();

            writeDraft(storageKey, {
                values: getValues(),
                pageIndex,
                savedAt: now,
            });
            setSavedAt(now);
        };

        // Moving between steps is worth remembering at once; typing is
        // debounced so a phone isn't serialising the roster on every key.
        save();
        const unsubscribe = subscribe({
            formState: { values: true },
            callback: () => {
                if (saveTimer.current) {
                    clearTimeout(saveTimer.current);
                }

                saveTimer.current = setTimeout(save, 500);
            },
        });

        return () => {
            unsubscribe();

            if (saveTimer.current) {
                clearTimeout(saveTimer.current);
            }
        };
    }, [subscribe, getValues, storageKey, pageIndex]);

    function startOver() {
        clearDraft(storageKey);
        reset(defaultValuesFor(pages) as FormValues);
        setPageIndex(0);
        setRestoredAt(null);
    }

    // Errors already on screen were worded in the previous language; the new
    // resolver only speaks up on the next change, so ask it now.
    const hasErrors = Object.keys(errors).length > 0;
    useEffect(() => {
        if (hasErrors) {
            void trigger();
        }
        // Only a language switch should re-run this, not every keystroke.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [locale]);

    const isTeam = registrationCategory.subject_type === 'team';
    const isFreeCategory =
        !registrationCategory.price || Number(registrationCategory.price) === 0;
    const { accent, accentDark } = accentColors(event.accent_color);
    const radiusValue =
        branding.border_radius === 'sharp'
            ? '2px'
            : branding.border_radius === 'pill'
              ? '9999px'
              : branding.border_radius === 'rounded'
                ? '0.75rem'
                : undefined;
    const accentStyle = {
        '--accent': branding.primary_color || accent,
        '--accent-dark': branding.secondary_color || accentDark,
        ...(branding.font_family ? { fontFamily: branding.font_family } : {}),
    } as CSSProperties;
    const controlStyle: CSSProperties = radiusValue
        ? { borderRadius: radiusValue }
        : {};
    const cardStyle: CSSProperties = {
        ...(branding.background_color
            ? { backgroundColor: branding.background_color }
            : {}),
        ...(branding.text_color ? { color: branding.text_color } : {}),
    };

    const currentPage = pages[pageIndex];
    const isLastPage = pageIndex === pages.length - 1;
    const isFirstPage = pageIndex === 0;

    const onSubmit = (data: FormValues) => {
        setIsSaving(true);

        const raw = data as Record<string, unknown>;
        const payload: Record<string, unknown> = {
            name: raw.name,
            form_data: {},
            website: honeypot,
        };
        const formData = payload.form_data as Record<string, unknown>;

        inputFieldsOf(pages).forEach((f) => {
            if (f.key === 'name') {
                return;
            }

            if (RESERVED_KEYS.includes(f.key)) {
                payload[f.key] = raw[f.key];
            } else {
                formData[f.key] = raw[f.key];
            }
        });

        // The roster block's members go up as their own array: the server
        // turns them into the team sheet rather than storing them as answers.
        if (rosterField) {
            payload.roster = raw.roster;
        }

        router.post(
            `/events/${event.id}/registration-categories/${registrationCategory.id}/register`,
            payload as never,
            {
                onFinish: () => setIsSaving(false),
                onError: (errors) => {
                    let firstKey: string | null = null;

                    Object.entries(errors).forEach(([field, message]) => {
                        const key = field.replace(/^form_data\./, '');
                        firstKey ??= key;
                        setError(key as never, {
                            type: 'manual',
                            message: message as string,
                        });
                    });

                    if (firstKey) {
                        const key = firstKey;
                        const target = pageIndexOf(pages, key);

                        if (target !== -1) {
                            setPageIndex(target);
                        }

                        // rAF, so the page switch above has painted before we
                        // look for the field to scroll to.
                        requestAnimationFrame(() => scrollToField(key));
                    }
                },
            },
        );
    };

    async function goNext() {
        if (!currentPage) {
            return;
        }

        const keys = currentPage.fields
            .filter((f) => isInputField(f) && f.key !== 'name')
            .map((f) => f.key);

        if (currentPage.fields.some(isRosterField)) {
            keys.push('roster');
        }

        const namesToCheck = (
            pageIndex === 0 ? ['name', ...keys] : keys
        ) as never[];
        const valid = await trigger(namesToCheck);

        if (valid) {
            setPageIndex((i) => Math.min(i + 1, pages.length - 1));

            return;
        }

        const firstInvalid = namesToCheck.find(
            (k) => getFieldState(k).invalid,
        );

        if (firstInvalid) {
            requestAnimationFrame(() => scrollToField(firstInvalid as string));
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
                confirmationMessage={
                    registrationCategory.form_settings?.confirmation_message
                }
            />
        );
    }

    if (registrationClosed) {
        return (
            <>
                <Head
                    title={t('Registration Closed — :event', {
                        event: event.name,
                    })}
                />

                <div
                    className="relative flex min-h-screen items-center justify-center bg-paper px-4 py-10"
                    style={accentStyle}
                >
                    <div className="relative z-10 w-full max-w-md overflow-hidden rounded-2xl border border-ink/10 bg-paper">
                        <PublicPageHeader
                            eyebrow={t('Registration')}
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
                                {t(
                                    'Registration for this category is currently closed or full. Please contact the organizer for more information.',
                                )}
                            </p>
                            {event.contact_person && (
                                <p className="text-sm font-medium text-neutral-500">
                                    {t('Contact')}: {event.contact_person}
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            </>
        );
    }

    return (
        <>
            <Head
                title={t(':category Registration — :event', {
                    category: registrationCategory.name,
                    event: event.name,
                })}
            />

            <div
                className="relative flex min-h-screen items-center justify-center bg-paper px-4 py-10"
                style={accentStyle}
            >
                <div
                    className="relative z-10 w-full max-w-md overflow-hidden rounded-2xl border border-ink/10 bg-paper"
                    style={cardStyle}
                >
                    <PublicPageHeader
                        eyebrow={t('Registration')}
                        title={event.name}
                        subtitle={registrationCategory.name}
                        logoUrl={branding.logo_url || event.logo}
                        accentColor={event.accent_color}
                    />

                    {/* Order summary — a registrant must see what they are buying and
                        what it costs on the same screen as the submit button, not for
                        the first time on the payment step. */}
                    <div className="border-b border-neutral-200 bg-neutral-50 px-6 py-4">
                        <div className="flex items-start justify-between gap-4">
                            <div className="flex flex-col">
                                <span className="text-xs font-semibold tracking-wide text-neutral-500 uppercase">
                                    {t('You are registering for')}
                                </span>
                                <span className="text-sm font-bold text-neutral-900">
                                    {registrationCategory.name}
                                </span>
                                <span className="text-xs text-neutral-500">
                                    {event.name} ·{' '}
                                    {isTeam ? t('Per team') : t('Per person')}
                                </span>
                            </div>
                            {/* A free category gets no price tag — a bare
                                "Free" beside the category name is clutter. */}
                            {!isFreeCategory && (
                                <span className="shrink-0 text-lg font-black text-neutral-900">
                                    {formatRupiah(registrationCategory.price)}
                                </span>
                            )}
                        </div>
                        {!isFreeCategory && (
                            <p className="mt-2 text-xs text-neutral-500">
                                {t(
                                    'After you submit this form your slot is reserved and you’ll be taken to the Midtrans payment page to pay :price. The registration is confirmed once payment settles.',
                                    {
                                        price: formatRupiah(
                                            registrationCategory.price,
                                        ),
                                    },
                                )}
                            </p>
                        )}
                    </div>

                    {pages.length > 1 && (
                        <div className="px-6 pt-4">
                            <div className="flex items-center justify-between text-xs font-medium text-neutral-500">
                                <span>
                                    {t('Step :current of :total', {
                                        current: pageIndex + 1,
                                        total: pages.length,
                                    })}
                                </span>
                                <span>{currentPage?.title}</span>
                            </div>
                            <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-neutral-200">
                                <div
                                    className="h-full bg-[var(--accent)] transition-all"
                                    style={{
                                        width: `${((pageIndex + 1) / pages.length) * 100}%`,
                                    }}
                                />
                            </div>
                        </div>
                    )}

                    {savedAt && (
                        <p
                            className="flex items-center gap-1.5 px-6 pt-3 text-[11px] text-neutral-500"
                            suppressHydrationWarning
                        >
                            <Save className="h-3.5 w-3.5 text-emerald-600" />
                            {t(
                                'Saved automatically on this device at :time — you can close this page and continue later.',
                                {
                                    time: new Date(savedAt).toLocaleTimeString(
                                        'id-ID',
                                        { hour: '2-digit', minute: '2-digit' },
                                    ),
                                },
                            )}
                        </p>
                    )}

                    <form
                        onSubmit={handleSubmit(onSubmit)}
                        className="px-6 py-6"
                    >
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

                        {isFirstPage && rosterField && (
                            <RosterRequirementsCard
                                field={rosterField}
                                rosterDeadline={rosterDeadline}
                            />
                        )}

                        {restoredAt && (
                            <div
                                role="status"
                                className="mb-5 flex flex-col gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 sm:flex-row sm:items-center sm:justify-between"
                            >
                                <span suppressHydrationWarning>
                                    {t(
                                        'Your unfinished registration from :time was restored.',
                                        { time: formatDateTime(restoredAt) },
                                    )}
                                </span>
                                <button
                                    type="button"
                                    onClick={startOver}
                                    className="shrink-0 cursor-pointer text-left font-semibold underline underline-offset-2 hover:text-ink"
                                >
                                    {t('Start over')}
                                </button>
                            </div>
                        )}

                        <FieldGroup>
                            {isFirstPage && (
                                <Controller
                                    name={'name' as never}
                                    control={control}
                                    render={({ field, fieldState }) => (
                                        <Field
                                            data-invalid={fieldState.invalid}
                                        >
                                            <FieldLabel htmlFor="name">
                                                {isTeam
                                                    ? t('Team Name')
                                                    : t('Full Name')}
                                                <RequiredMark />
                                            </FieldLabel>
                                            <Input
                                                {...field}
                                                id="name"
                                                placeholder={
                                                    isTeam
                                                        ? t(
                                                              'Input your team’s name',
                                                          )
                                                        : t('Input your name')
                                                }
                                                aria-invalid={
                                                    fieldState.invalid
                                                }
                                                autoComplete="off"
                                                disabled={isSaving}
                                                style={controlStyle}
                                                className="border-2 border-black focus-visible:ring-[var(--accent)]"
                                            />
                                            {fieldState.invalid && (
                                                <FieldError
                                                    errors={[fieldState.error]}
                                                />
                                            )}
                                        </Field>
                                    )}
                                />
                            )}

                            {(currentPage?.fields ?? [])
                                .filter((f) => f.key !== 'name')
                                .map((f) =>
                                    isRosterField(f) ? (
                                        <RosterBlock
                                            key={f.key}
                                            field={f}
                                            rosterDeadline={rosterDeadline}
                                            control={control}
                                            errors={
                                                (
                                                    errors as Record<
                                                        string,
                                                        unknown
                                                    >
                                                ).roster as never
                                            }
                                            setError={setError}
                                            disabled={isSaving}
                                            controlStyle={controlStyle}
                                        />
                                    ) : !isInputField(f) ? (
                                        <DescriptionBlock
                                            key={f.key}
                                            field={f}
                                        />
                                    ) : (
                                        <Controller
                                            key={f.key}
                                            name={f.key as never}
                                            control={control}
                                            render={({ field, fieldState }) => (
                                                <Field
                                                    data-invalid={
                                                        fieldState.invalid
                                                    }
                                                >
                                                    <FieldLabel htmlFor={f.key}>
                                                        {f.label}
                                                        {f.required && (
                                                            <RequiredMark />
                                                        )}
                                                        {!f.required && (
                                                            <span className="font-normal text-muted-foreground">
                                                                {' '}
                                                                {t(
                                                                    '(Optional)',
                                                                )}
                                                            </span>
                                                        )}
                                                    </FieldLabel>

                                                    {f.type === 'file' ? (
                                                        <UploadImage
                                                            value={
                                                                field.value as string
                                                            }
                                                            ratio={imageRatioOf(
                                                                f,
                                                            )}
                                                            uploadUrl="/public-upload/image"
                                                            deleteUrl="/public-upload/image"
                                                            onChange={(value) =>
                                                                field.onChange(
                                                                    value ?? '',
                                                                )
                                                            }
                                                            onError={(error) =>
                                                                setError(
                                                                    f.key as never,
                                                                    {
                                                                        type: 'manual',
                                                                        message:
                                                                            typeof error ===
                                                                            'string'
                                                                                ? error
                                                                                : t(
                                                                                      'Upload failed',
                                                                                  ),
                                                                    },
                                                                )
                                                            }
                                                            enableCrop
                                                            className="rounded-2xl border-2 border-black"
                                                        />
                                                    ) : f.type ===
                                                      'document' ? (
                                                        <UploadDocument
                                                            value={
                                                                field.value as string
                                                            }
                                                            uploadUrl="/public-upload/document"
                                                            deleteUrl="/public-upload/document"
                                                            onChange={(value) =>
                                                                field.onChange(
                                                                    value ?? '',
                                                                )
                                                            }
                                                            onError={(error) =>
                                                                setError(
                                                                    f.key as never,
                                                                    {
                                                                        type: 'manual',
                                                                        message:
                                                                            typeof error ===
                                                                            'string'
                                                                                ? error
                                                                                : t(
                                                                                      'Upload failed',
                                                                                  ),
                                                                    },
                                                                )
                                                            }
                                                            className="rounded-2xl border-2 border-black"
                                                        />
                                                    ) : f.type ===
                                                      'signature' ? (
                                                        <SignaturePad
                                                            value={
                                                                field.value as string
                                                            }
                                                            disabled={isSaving}
                                                            onChange={(value) =>
                                                                field.onChange(
                                                                    value ?? '',
                                                                )
                                                            }
                                                            onError={(error) =>
                                                                setError(
                                                                    f.key as never,
                                                                    {
                                                                        type: 'manual',
                                                                        message:
                                                                            error,
                                                                    },
                                                                )
                                                            }
                                                        />
                                                    ) : f.type === 'rating' ? (
                                                        <RatingInput
                                                            value={
                                                                field.value as string
                                                            }
                                                            onChange={
                                                                field.onChange
                                                            }
                                                            max={
                                                                f.max_rating ??
                                                                5
                                                            }
                                                            disabled={isSaving}
                                                        />
                                                    ) : f.type ===
                                                      'textarea' ? (
                                                        <Textarea
                                                            {...field}
                                                            id={f.key}
                                                            value={
                                                                field.value as string
                                                            }
                                                            disabled={isSaving}
                                                            style={controlStyle}
                                                            className="border-2 border-black focus-visible:ring-[var(--accent)]"
                                                        />
                                                    ) : f.type === 'select' ? (
                                                        <Select
                                                            value={
                                                                field.value as string
                                                            }
                                                            onValueChange={
                                                                field.onChange
                                                            }
                                                            disabled={isSaving}
                                                        >
                                                            <SelectTrigger
                                                                id={f.key}
                                                                style={
                                                                    controlStyle
                                                                }
                                                                className="w-full cursor-pointer border-2 border-black font-semibold focus-visible:ring-[var(--accent)]"
                                                            >
                                                                <SelectValue
                                                                    placeholder={t(
                                                                        'Select an option',
                                                                    )}
                                                                />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                {(
                                                                    f.options ??
                                                                    []
                                                                ).map(
                                                                    (
                                                                        option,
                                                                    ) => (
                                                                        <SelectItem
                                                                            key={
                                                                                option
                                                                            }
                                                                            value={
                                                                                option
                                                                            }
                                                                            className="cursor-pointer"
                                                                        >
                                                                            {
                                                                                option
                                                                            }
                                                                        </SelectItem>
                                                                    ),
                                                                )}
                                                            </SelectContent>
                                                        </Select>
                                                    ) : f.type === 'radio' ? (
                                                        <ChoiceGroup
                                                            name={f.key}
                                                            label={f.label}
                                                            options={
                                                                f.options ?? []
                                                            }
                                                            value={
                                                                field.value as string
                                                            }
                                                            onChange={
                                                                field.onChange
                                                            }
                                                            disabled={isSaving}
                                                            controlStyle={
                                                                controlStyle
                                                            }
                                                            invalid={
                                                                fieldState.invalid
                                                            }
                                                        />
                                                    ) : f.type === 'gender' ? (
                                                        <GenderChoice
                                                            name={f.key}
                                                            label={f.label}
                                                            value={
                                                                field.value as string
                                                            }
                                                            onChange={
                                                                field.onChange
                                                            }
                                                            disabled={isSaving}
                                                            controlStyle={
                                                                controlStyle
                                                            }
                                                            invalid={
                                                                fieldState.invalid
                                                            }
                                                        />
                                                    ) : f.type ===
                                                      'checkbox' ? (
                                                        <BooleanChoice
                                                            id={f.key}
                                                            label={
                                                                f.help_text ??
                                                                t('Yes')
                                                            }
                                                            checked={
                                                                field.value as boolean
                                                            }
                                                            onChange={
                                                                field.onChange
                                                            }
                                                            disabled={isSaving}
                                                            controlStyle={
                                                                controlStyle
                                                            }
                                                        />
                                                    ) : (
                                                        <Input
                                                            {...field}
                                                            id={f.key}
                                                            value={
                                                                field.value as string
                                                            }
                                                            type={
                                                                f.type ===
                                                                'date'
                                                                    ? 'date'
                                                                    : f.type ===
                                                                        'number'
                                                                      ? 'text'
                                                                      : f.type ===
                                                                          'email'
                                                                        ? 'email'
                                                                        : 'text'
                                                            }
                                                            inputMode={
                                                                f.type ===
                                                                'number'
                                                                    ? 'decimal'
                                                                    : undefined
                                                            }
                                                            aria-invalid={
                                                                fieldState.invalid
                                                            }
                                                            autoComplete="off"
                                                            disabled={isSaving}
                                                            style={controlStyle}
                                                            className="border-2 border-black focus-visible:ring-[var(--accent)]"
                                                        />
                                                    )}

                                                    {f.help_text &&
                                                        f.type !==
                                                            'checkbox' && (
                                                            <FieldDescription className="whitespace-pre-line">
                                                                {f.help_text}
                                                            </FieldDescription>
                                                        )}
                                                    {fieldState.invalid && (
                                                        <FieldError
                                                            errors={[
                                                                fieldState.error,
                                                            ]}
                                                        />
                                                    )}
                                                </Field>
                                            )}
                                        />
                                    ),
                                )}

                            <div className="mt-2 flex gap-2">
                                {!isFirstPage && (
                                    <Button
                                        type="button"
                                        variant="outline"
                                        className="flex-1 cursor-pointer"
                                        onClick={() =>
                                            setPageIndex((i) =>
                                                Math.max(i - 1, 0),
                                            )
                                        }
                                        disabled={isSaving}
                                        style={controlStyle}
                                    >
                                        {t('Back')}
                                    </Button>
                                )}

                                {isLastPage ? (
                                    <Button
                                        type="submit"
                                        className="flex-1 cursor-pointer bg-[var(--accent)] font-bold tracking-wide text-white uppercase hover:bg-[var(--accent-dark)]"
                                        disabled={isSaving}
                                        style={controlStyle}
                                    >
                                        {isSaving ? (
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        ) : (
                                            <CheckCircle2 className="mr-2 h-4 w-4" />
                                        )}
                                        {isSaving
                                            ? t('Registering…')
                                            : branding.button_label ||
                                              t('Register')}
                                    </Button>
                                ) : (
                                    <Button
                                        type="button"
                                        className="flex-1 cursor-pointer bg-[var(--accent)] font-bold tracking-wide text-white uppercase hover:bg-[var(--accent-dark)]"
                                        onClick={goNext}
                                        style={controlStyle}
                                    >
                                        {t('Next')}
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
