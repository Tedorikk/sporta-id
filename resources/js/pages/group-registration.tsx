import { zodResolver } from '@hookform/resolvers/zod';
import { Head, router } from '@inertiajs/react';
import axios from 'axios';
import { toast } from 'sonner';
import {
    ArrowLeft,
    CheckCircle2,
    ChevronRight,
    Loader2,
    Pencil,
    Plus,
    Trash2,
    Users,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import * as z from 'zod';
import {
    status as orderStatus,
    store as storeGroupRegistration,
} from '@/actions/App/Http/Controllers/GroupRegistrationController';
import {
    BooleanChoice,
    ChoiceGroup,
    DescriptionBlock,
    GenderChoice,
    RatingInput,
} from '@/components/public/dynamic-field-controls';
import { PublicPageHeader } from '@/components/public/public-page-header';
import { RequiredMark } from '@/components/public/required-mark';
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
import type { Translate } from '@/lib/i18n';
import { loadSnapScript } from '@/lib/midtrans';
import type { Event } from '@/types/event';
import type {
    PublicRegistrationCategory,
    RegistrationField,
} from '@/types/registration-category';
import { imageRatioOf, isInputField } from '@/types/registration-category';

interface Props {
    event: Event;
    categories: PublicRegistrationCategory[];
}

const RESERVED_KEYS = ['name', 'email', 'phone', 'photo'];
const PHONE_REGEX = /^[0-9+\-\s()]{6,25}$/;

interface Participant {
    _id: string;
    registration_category_id: number | null;
    name: string;
    email: string;
    phone: string;
    photo: string;
    form_data: Record<string, unknown>;
}

function uid() {
    return crypto.randomUUID();
}

function isFreeCategory(category: PublicRegistrationCategory): boolean {
    return !category.price || Number(category.price) === 0;
}

function emptyParticipant(): Participant {
    return {
        _id: uid(),
        registration_category_id: null,
        name: '',
        email: '',
        phone: '',
        photo: '',
        form_data: {},
    };
}

/** Every field across the category's pages, roster blocks excluded (individual categories never carry one). */
function allFieldsOf(
    category: PublicRegistrationCategory,
): RegistrationField[] {
    return (category.form_pages ?? []).flatMap((page) => page.fields);
}

/** Only the fields that collect an answer — what validates, defaults and submits. */
function inputFieldsOf(
    category: PublicRegistrationCategory,
): RegistrationField[] {
    return allFieldsOf(category).filter(isInputField);
}

function buildSchema(category: PublicRegistrationCategory, t: Translate) {
    const shape: Record<string, z.ZodTypeAny> = {
        name: z.string().min(1, t('Input a name')).max(255),
    };

    inputFieldsOf(category).forEach((f) => {
        if (f.key === 'name') {
            return;
        }

        shape[f.key] = f.type === 'checkbox' ? z.boolean() : z.string();
    });

    if (!isFreeCategory(category)) {
        shape.email = z.string().min(1, t('Email is required'));
    }

    return z.object(shape).superRefine((data, ctx) => {
        inputFieldsOf(category).forEach((f) => {
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

            if (f.type === 'gender' && value !== 'male' && value !== 'female') {
                ctx.addIssue({
                    code: 'custom',
                    path: [f.key],
                    message: t(':label is required', { label: f.label }),
                });
            }
        });
    });
}

function defaultValuesFor(
    category: PublicRegistrationCategory,
    draft: Participant,
) {
    const defaults: Record<string, unknown> = { name: draft.name };

    inputFieldsOf(category).forEach((f) => {
        if (f.key === 'name') {
            return;
        }

        const existing = RESERVED_KEYS.includes(f.key)
            ? (draft as unknown as Record<string, unknown>)[f.key]
            : draft.form_data[f.key];

        defaults[f.key] = existing ?? (f.type === 'checkbox' ? false : '');
    });

    return defaults;
}

/** One participant's own form — its fields come entirely from their chosen category. */
function ParticipantForm({
    event,
    category,
    draft,
    onSave,
    onCancel,
}: {
    event: Event;
    category: PublicRegistrationCategory;
    draft: Participant;
    onSave: (draft: Participant) => void;
    onCancel: () => void;
}) {
    const { t } = useT();
    const [isSaving, setIsSaving] = useState(false);
    const schema = useMemo(() => buildSchema(category, t), [category, t]);
    type FormValues = z.infer<typeof schema>;

    const { control, handleSubmit, setError } = useForm<FormValues>({
        resolver: zodResolver(schema),
        defaultValues: defaultValuesFor(category, draft) as FormValues,
        mode: 'onChange',
    });

    const { accent, accentDark } = accentColors(event.accent_color);
    const accentStyle = {
        '--accent': accent,
        '--accent-dark': accentDark,
    } as React.CSSProperties;

    const onSubmit = (data: FormValues) => {
        setIsSaving(true);
        const raw = data as Record<string, unknown>;
        const formData: Record<string, unknown> = {};

        inputFieldsOf(category).forEach((f) => {
            if (f.key === 'name' || RESERVED_KEYS.includes(f.key)) {
                return;
            }

            formData[f.key] = raw[f.key];
        });

        onSave({
            ...draft,
            registration_category_id: category.id,
            name: String(raw.name ?? ''),
            email: String(raw.email ?? draft.email ?? ''),
            phone: String(raw.phone ?? draft.phone ?? ''),
            photo: String(raw.photo ?? draft.photo ?? ''),
            form_data: formData,
        });
        setIsSaving(false);
    };

    return (
        <form
            onSubmit={handleSubmit(onSubmit)}
            className="px-6 py-6"
            style={accentStyle}
        >
            <FieldGroup>
                <Controller
                    name={'name' as never}
                    control={control}
                    render={({ field, fieldState }) => (
                        <Field data-invalid={fieldState.invalid}>
                            <FieldLabel htmlFor="name">
                                {category.form_settings?.name_field_label ||
                                    t('Full Name')}
                                <RequiredMark />
                            </FieldLabel>
                            <Input
                                {...field}
                                id="name"
                                autoComplete="off"
                                disabled={isSaving}
                                className="border-2 border-black"
                            />
                            {fieldState.invalid && (
                                <FieldError errors={[fieldState.error]} />
                            )}
                        </Field>
                    )}
                />

                {allFieldsOf(category)
                    .filter((f) => f.key !== 'name')
                    .map((f) =>
                        !isInputField(f) ? (
                            <DescriptionBlock key={f.key} field={f} />
                        ) : (
                            <Controller
                                key={f.key}
                                name={f.key as never}
                                control={control}
                                render={({ field, fieldState }) => (
                                    <Field data-invalid={fieldState.invalid}>
                                        <FieldLabel htmlFor={f.key}>
                                            {f.label}
                                            {f.required && <RequiredMark />}
                                            {!f.required && (
                                                <span className="font-normal text-muted-foreground">
                                                    {' '}
                                                    {t('(Optional)')}
                                                </span>
                                            )}
                                        </FieldLabel>

                                        {f.type === 'file' ? (
                                            <UploadImage
                                                value={field.value as string}
                                                ratio={imageRatioOf(f)}
                                                uploadUrl="/public-upload/image"
                                                deleteUrl="/public-upload/image"
                                                onChange={(value) =>
                                                    field.onChange(value ?? '')
                                                }
                                                onError={(error) =>
                                                    setError(f.key as never, {
                                                        type: 'manual',
                                                        message:
                                                            typeof error ===
                                                            'string'
                                                                ? error
                                                                : t(
                                                                      'Upload failed',
                                                                  ),
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
                                                onChange={(value) =>
                                                    field.onChange(value ?? '')
                                                }
                                                onError={(error) =>
                                                    setError(f.key as never, {
                                                        type: 'manual',
                                                        message:
                                                            typeof error ===
                                                            'string'
                                                                ? error
                                                                : t(
                                                                      'Upload failed',
                                                                  ),
                                                    })
                                                }
                                                className="rounded-2xl border-2 border-black"
                                            />
                                        ) : f.type === 'signature' ? (
                                            <SignaturePad
                                                value={field.value as string}
                                                disabled={isSaving}
                                                onChange={(value) =>
                                                    field.onChange(value ?? '')
                                                }
                                                onError={(error) =>
                                                    setError(f.key as never, {
                                                        type: 'manual',
                                                        message: error,
                                                    })
                                                }
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
                                                className="border-2 border-black"
                                            />
                                        ) : f.type === 'select' ? (
                                            <Select
                                                value={field.value as string}
                                                onValueChange={field.onChange}
                                                disabled={isSaving}
                                            >
                                                <SelectTrigger
                                                    id={f.key}
                                                    className="w-full cursor-pointer border-2 border-black font-semibold"
                                                >
                                                    <SelectValue
                                                        placeholder={t(
                                                            'Select an option',
                                                        )}
                                                    />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {(f.options ?? []).map(
                                                        (option) => (
                                                            <SelectItem
                                                                key={option}
                                                                value={option}
                                                                className="cursor-pointer"
                                                            >
                                                                {option}
                                                            </SelectItem>
                                                        ),
                                                    )}
                                                </SelectContent>
                                            </Select>
                                        ) : f.type === 'radio' ? (
                                            <ChoiceGroup
                                                name={f.key}
                                                label={f.label}
                                                options={f.options ?? []}
                                                value={field.value as string}
                                                onChange={field.onChange}
                                                disabled={isSaving}
                                                controlStyle={{}}
                                                invalid={fieldState.invalid}
                                            />
                                        ) : f.type === 'gender' ? (
                                            <GenderChoice
                                                name={f.key}
                                                label={f.label}
                                                value={field.value as string}
                                                onChange={field.onChange}
                                                disabled={isSaving}
                                                controlStyle={{}}
                                                invalid={fieldState.invalid}
                                            />
                                        ) : f.type === 'checkbox' ? (
                                            <BooleanChoice
                                                id={f.key}
                                                label={f.help_text ?? t('Yes')}
                                                checked={field.value as boolean}
                                                onChange={field.onChange}
                                                disabled={isSaving}
                                                controlStyle={{}}
                                            />
                                        ) : (
                                            <Input
                                                {...field}
                                                id={f.key}
                                                value={field.value as string}
                                                type={
                                                    f.type === 'date'
                                                        ? 'date'
                                                        : f.type === 'number'
                                                          ? 'text'
                                                          : f.type === 'email'
                                                            ? 'email'
                                                            : 'text'
                                                }
                                                inputMode={
                                                    f.type === 'number'
                                                        ? 'decimal'
                                                        : undefined
                                                }
                                                autoComplete="off"
                                                disabled={isSaving}
                                                className="border-2 border-black"
                                            />
                                        )}

                                        {f.help_text &&
                                            f.type !== 'checkbox' && (
                                                <FieldDescription className="whitespace-pre-line">
                                                    {f.help_text}
                                                </FieldDescription>
                                            )}
                                        {fieldState.invalid && (
                                            <FieldError
                                                errors={[fieldState.error]}
                                            />
                                        )}
                                    </Field>
                                )}
                            />
                        ),
                    )}

                <div className="mt-2 flex gap-2">
                    <Button
                        type="button"
                        variant="outline"
                        className="flex-1"
                        onClick={onCancel}
                        disabled={isSaving}
                    >
                        {t('Cancel')}
                    </Button>
                    <Button
                        type="submit"
                        className="flex-1 bg-[var(--accent)] font-bold tracking-wide text-ink uppercase hover:bg-[var(--accent-dark)]"
                        disabled={isSaving}
                    >
                        {t('Save participant')}
                    </Button>
                </div>
            </FieldGroup>
        </form>
    );
}

function isParticipantComplete(
    participant: Participant,
    category: PublicRegistrationCategory | undefined,
): boolean {
    if (!category || !participant.name.trim()) {
        return false;
    }

    return inputFieldsOf(category).every((f) => {
        if (f.key === 'name' || !f.required) {
            return true;
        }

        const value = RESERVED_KEYS.includes(f.key)
            ? (participant as unknown as Record<string, unknown>)[f.key]
            : participant.form_data[f.key];

        return f.type === 'checkbox'
            ? value === true
            : typeof value === 'string' && value.trim() !== '';
    });
}

export default function GroupRegistration({ event, categories }: Props) {
    useForceLightMode();
    const { t } = useT();

    const [participants, setParticipants] = useState<Participant[]>([]);
    const [step, setStep] = useState<'list' | 'form' | 'review' | 'payment'>(
        'list',
    );
    const [editingId, setEditingId] = useState<string | null>(null);
    const [pickerCategoryId, setPickerCategoryId] = useState<string>('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isPaying, setIsPaying] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);
    const [payment, setPayment] = useState<{
        orderId: string;
        provider: 'midtrans' | 'xendit' | null;
        checkoutUrl: string | null;
        snapToken: string | null;
        midtransClientKey: string | null;
        midtransIsProduction: boolean;
    } | null>(null);

    const { accent, accentDark } = accentColors(event.accent_color);
    const accentStyle = {
        '--accent': accent,
        '--accent-dark': accentDark,
    } as React.CSSProperties;

    const categoryById = (id: number | null) =>
        categories.find((c) => c.id === id);

    const editing = participants.find((p) => p._id === editingId) ?? null;
    const editingCategory = editing
        ? categoryById(editing.registration_category_id)
        : categoryById(Number(pickerCategoryId) || null);

    const allComplete =
        participants.length > 0 &&
        participants.every((p) =>
            isParticipantComplete(p, categoryById(p.registration_category_id)),
        );

    const total = participants.reduce(
        (sum, p) =>
            sum + Number(categoryById(p.registration_category_id)?.price ?? 0),
        0,
    );

    function startAdding() {
        setEditingId(null);
        setPickerCategoryId('');
        setStep('form');
    }

    function startEditing(id: string) {
        setEditingId(id);
        setStep('form');
    }

    function removeParticipant(id: string) {
        setParticipants((list) => list.filter((p) => p._id !== id));
    }

    function saveParticipant(draft: Participant) {
        setParticipants((list) => {
            const exists = list.some((p) => p._id === draft._id);

            return exists
                ? list.map((p) => (p._id === draft._id ? draft : p))
                : [...list, draft];
        });
        setStep('list');
        setEditingId(null);
    }

    function submitOrder() {
        setIsSubmitting(true);
        setSubmitError(null);

        axios
            .post(storeGroupRegistration.url(event), {
                participants: participants.map((p) => ({
                    registration_category_id: p.registration_category_id,
                    name: p.name,
                    email: p.email || undefined,
                    phone: p.phone || undefined,
                    photo: p.photo || undefined,
                    form_data: p.form_data,
                })),
            })
            .then(({ data }) => {
                if (data.status === 'pending_payment') {
                    setPayment({
                        orderId: data.order_id,
                        provider: data.provider,
                        checkoutUrl: data.checkoutUrl,
                        snapToken: data.snapToken,
                        midtransClientKey: data.midtransClientKey,
                        midtransIsProduction: data.midtransIsProduction,
                    });
                    setStep('payment');
                } else {
                    router.visit(orderStatus.url(data.order_id));
                }
            })
            .catch((error) => {
                const message =
                    error.response?.data?.message ??
                    t('Something went wrong — please try again.');
                setSubmitError(message);
            })
            .finally(() => setIsSubmitting(false));
    }

    function payNow() {
        if (payment?.checkoutUrl) {
            window.location.assign(payment.checkoutUrl);

            return;
        }

        if (!payment?.snapToken || !payment.midtransClientKey) {
            return;
        }

        setIsPaying(true);
        loadSnapScript(payment.midtransClientKey, payment.midtransIsProduction)
            .then(() => {
                window.snap?.pay(payment.snapToken as string, {
                    onSuccess: () =>
                        router.visit(orderStatus.url(payment.orderId)),
                    onPending: () =>
                        router.visit(orderStatus.url(payment.orderId)),
                    onError: () => setIsPaying(false),
                    onClose: () => setIsPaying(false),
                });
            })
            .catch((error) => { setIsPaying(false); toast.error(error.message || "Payment checkout is unavailable at this time."); });
    }

    return (
        <>
            <Head
                title={t('Group Registration — :event', { event: event.name })}
            />

            <div
                className="relative flex min-h-screen items-center justify-center bg-paper px-4 py-10"
                style={accentStyle}
            >
                <div className="relative z-10 w-full max-w-md overflow-hidden rounded-2xl border border-ink/10 bg-paper">
                    <PublicPageHeader
                        eyebrow={t('Group Registration')}
                        title={event.name}
                        subtitle={t('Register several people in one payment')}
                        logoUrl={event.logo}
                        accentColor={event.accent_color}
                    />

                    {step === 'list' && (
                        <div className="flex flex-col gap-4 px-6 py-6">
                            {participants.length === 0 ? (
                                <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed py-10 text-center">
                                    <Users className="h-6 w-6 text-neutral-400" />
                                    <p className="text-sm font-medium">
                                        {t('No one added yet')}
                                    </p>
                                    <p className="max-w-xs text-xs text-neutral-500">
                                        {t(
                                            'Add each person — pick their category and fill their details — then pay once for everyone.',
                                        )}
                                    </p>
                                </div>
                            ) : (
                                <div className="flex flex-col gap-2">
                                    {participants.map((p) => {
                                        const category = categoryById(
                                            p.registration_category_id,
                                        );
                                        const complete = isParticipantComplete(
                                            p,
                                            category,
                                        );

                                        return (
                                            <div
                                                key={p._id}
                                                className="flex items-center justify-between gap-2 rounded-xl border-2 border-black px-3 py-2.5"
                                            >
                                                <div className="min-w-0">
                                                    <p className="truncate text-sm font-semibold">
                                                        {p.name || t('Unnamed')}
                                                    </p>
                                                    <p className="truncate text-xs text-neutral-500">
                                                        {category?.name ??
                                                            t(
                                                                'No category chosen',
                                                            )}
                                                        {!complete &&
                                                            ` · ${t('Incomplete')}`}
                                                    </p>
                                                </div>
                                                <div className="flex shrink-0 items-center gap-1">
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8"
                                                        onClick={() =>
                                                            startEditing(p._id)
                                                        }
                                                    >
                                                        <Pencil className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-destructive"
                                                        onClick={() =>
                                                            removeParticipant(
                                                                p._id,
                                                            )
                                                        }
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}

                            <Button
                                type="button"
                                variant="outline"
                                onClick={startAdding}
                                className="w-full border-2 border-black"
                            >
                                <Plus className="mr-2 h-4 w-4" />
                                {t('Add participant')}
                            </Button>

                            {participants.length > 0 && (
                                <div className="flex items-center justify-between border-t border-neutral-200 pt-3 text-sm font-semibold">
                                    <span>{t('Total')}</span>
                                    <span>{formatRupiah(total)}</span>
                                </div>
                            )}

                            <Button
                                type="button"
                                disabled={!allComplete}
                                onClick={() => setStep('review')}
                                className="w-full bg-[var(--accent)] font-bold tracking-wide text-ink uppercase hover:bg-[var(--accent-dark)]"
                            >
                                {t('Continue')}
                                <ChevronRight className="ml-2 h-4 w-4" />
                            </Button>
                        </div>
                    )}

                    {step === 'form' && (
                        <>
                            {!editingCategory && (
                                <div className="px-6 py-6">
                                    <FieldGroup>
                                        <Field>
                                            <FieldLabel htmlFor="category-picker">
                                                {t('Category')}
                                            </FieldLabel>
                                            <Select
                                                value={pickerCategoryId}
                                                onValueChange={
                                                    setPickerCategoryId
                                                }
                                            >
                                                <SelectTrigger
                                                    id="category-picker"
                                                    className="w-full cursor-pointer border-2 border-black"
                                                >
                                                    <SelectValue
                                                        placeholder={t(
                                                            'Choose a category',
                                                        )}
                                                    />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {categories.map((c) => (
                                                        <SelectItem
                                                            key={c.id}
                                                            value={String(c.id)}
                                                            disabled={
                                                                !c.is_available
                                                            }
                                                            className="cursor-pointer"
                                                        >
                                                            {c.name} —{' '}
                                                            {isFreeCategory(c)
                                                                ? t('Free')
                                                                : formatRupiah(
                                                                      c.price,
                                                                  )}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </Field>
                                    </FieldGroup>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        className="mt-4 w-full"
                                        onClick={() => setStep('list')}
                                    >
                                        <ArrowLeft className="mr-2 h-4 w-4" />
                                        {t('Back')}
                                    </Button>
                                </div>
                            )}

                            {editingCategory && (
                                <ParticipantForm
                                    event={event}
                                    category={editingCategory}
                                    draft={editing ?? emptyParticipant()}
                                    onSave={saveParticipant}
                                    onCancel={() => setStep('list')}
                                />
                            )}
                        </>
                    )}

                    {step === 'review' && (
                        <div className="flex flex-col gap-4 px-6 py-6">
                            <div className="flex flex-col gap-2">
                                {participants.map((p) => (
                                    <div
                                        key={p._id}
                                        className="flex items-center justify-between gap-2 rounded-xl border border-neutral-200 px-3 py-2 text-sm"
                                    >
                                        <span className="min-w-0 truncate font-medium">
                                            {p.name}
                                        </span>
                                        <span className="shrink-0 text-neutral-500">
                                            {formatRupiah(
                                                categoryById(
                                                    p.registration_category_id,
                                                )?.price ?? null,
                                            )}
                                        </span>
                                    </div>
                                ))}
                            </div>

                            <div className="flex items-center justify-between border-t border-neutral-200 pt-3 text-base font-bold">
                                <span>{t('Total')}</span>
                                <span>{formatRupiah(total)}</span>
                            </div>

                            {submitError && (
                                <p className="text-sm text-destructive">
                                    {submitError}
                                </p>
                            )}

                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setStep('list')}
                                disabled={isSubmitting}
                            >
                                <ArrowLeft className="mr-2 h-4 w-4" />
                                {t('Back')}
                            </Button>
                            <Button
                                type="button"
                                onClick={submitOrder}
                                disabled={isSubmitting}
                                className="w-full bg-[var(--accent)] font-bold tracking-wide text-ink uppercase hover:bg-[var(--accent-dark)]"
                            >
                                {isSubmitting ? (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                ) : (
                                    <CheckCircle2 className="mr-2 h-4 w-4" />
                                )}
                                {total > 0
                                    ? t('Confirm & Pay')
                                    : t('Confirm Registration')}
                            </Button>
                        </div>
                    )}

                    {step === 'payment' && payment && (
                        <div className="flex flex-col items-center gap-4 px-6 py-10 text-center">
                            <p className="text-3xl font-bold text-neutral-900">
                                {formatRupiah(total)}
                            </p>
                            <p className="text-sm text-neutral-600">
                                {t(
                                    'Your slots are reserved — complete payment to confirm every participant.',
                                )}
                            </p>
                            {payment.snapToken || payment.checkoutUrl ? (
                                <Button
                                    type="button"
                                    onClick={payNow}
                                    disabled={isPaying}
                                    className="w-full bg-[var(--accent)] font-bold tracking-wide text-ink uppercase hover:bg-[var(--accent-dark)]"
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
                                        'Couldn’t start payment just now — use the order status page to try again.',
                                    )}
                                </p>
                            )}
                            <a
                                href={orderStatus.url(payment.orderId)}
                                className="text-sm font-medium text-neutral-500 underline-offset-2 hover:underline"
                            >
                                {t('Check order status')}
                            </a>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}
