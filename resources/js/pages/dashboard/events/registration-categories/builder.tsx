import type { FormDataConvertible } from '@inertiajs/core';
import { Head, Link, router } from '@inertiajs/react';
import { ChevronLeft, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import type { Event } from '@/types/event';
import type {
    FormBranding,
    FormSettings,
    RegistrationCategory,
    RegistrationFieldType,
    RegistrationSubjectType,
} from '@/types/registration-category';
import {
    OPTION_FIELD_TYPES,
    REGISTRATION_FIELD_TYPES,
} from '@/types/registration-category';
import type { DraftField } from './components/builder/field-list';
import { FieldList } from './components/builder/field-list';
import { FieldPalette } from './components/builder/field-palette';
import type { DraftPage } from './components/builder/page-tabs';
import { PageTabs } from './components/builder/page-tabs';
import {
    DUPLICATE_FIELD_RESERVED_OPTIONS,
    SettingsPanel,
} from './components/builder/settings-panel';
import type { FormTemplate } from './components/builder/templates';
import { FORM_TEMPLATES } from './components/builder/templates';

interface Props {
    event: Event;
    registrationCategory: RegistrationCategory | null;
}

function uid() {
    return crypto.randomUUID();
}

/**
 * Trims each choice and drops the blanks a half-finished row leaves behind, so
 * a respondent never sees an empty option.
 */
function cleanOptions(options: string[] | undefined): string[] {
    return (options ?? []).map((o) => o.trim()).filter(Boolean);
}

function slugify(label: string, existing: string[]): string {
    const base =
        label
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '_')
            .replace(/^_+|_+$/g, '') || 'field';
    let key = base;
    let i = 2;

    while (existing.includes(key)) {
        key = `${base}_${i++}`;
    }

    return key;
}

function toDraftPages(category: RegistrationCategory | null): DraftPage[] {
    const pages = category?.form_pages ?? [];

    if (pages.length === 0) {
        return [];
    }

    return pages.map((page) => ({
        _uid: uid(),
        key: page.key,
        title: page.title,
        description: page.description,
        fields: page.fields.map((field) => ({ ...field, _uid: uid() })),
    }));
}

export default function RegistrationCategoryBuilder({
    event,
    registrationCategory,
}: Props) {
    const isEditing = Boolean(registrationCategory);

    const [pages, setPages] = useState<DraftPage[]>(() =>
        toDraftPages(registrationCategory),
    );
    const [activeUid, setActiveUid] = useState<string>(
        () => pages[0]?._uid ?? '',
    );
    const [showTemplates, setShowTemplates] = useState(
        !isEditing && pages.length === 0,
    );

    const [details, setDetails] = useState({
        name: registrationCategory?.name ?? '',
        subject_type: (registrationCategory?.subject_type ??
            'team') as RegistrationSubjectType,
        price: registrationCategory?.price ?? '',
        quota:
            registrationCategory?.quota != null
                ? String(registrationCategory.quota)
                : '',
        registration_open: registrationCategory?.registration_open ?? true,
    });
    const [branding, setBranding] = useState<FormBranding>(
        registrationCategory?.form_branding ?? {},
    );
    const [settings, setSettings] = useState<FormSettings>(
        registrationCategory?.form_settings ?? {},
    );
    const [isSaving, setIsSaving] = useState(false);

    const activePage = pages.find((p) => p._uid === activeUid) ?? pages[0];

    function applyTemplate(template: FormTemplate) {
        const draft: DraftPage[] = template.pages.map((page) => ({
            _uid: uid(),
            key: `page-${uid().slice(0, 8)}`,
            title: page.title,
            description: page.description,
            fields: (page.fields ?? []).map((field) => ({
                ...field,
                _uid: uid(),
            })),
        }));

        setPages(draft);
        setActiveUid(draft[0]?._uid ?? '');
        setShowTemplates(false);
    }

    function updatePageFields(pageUid: string, fields: DraftField[]) {
        setPages(pages.map((p) => (p._uid === pageUid ? { ...p, fields } : p)));
    }

    function addField(type: RegistrationFieldType) {
        if (!activePage) {
            return;
        }

        const label =
            REGISTRATION_FIELD_TYPES.find((t) => t.value === type)?.label ??
            type;
        const existingKeys = pages.flatMap((p) => p.fields.map((f) => f.key));

        const newField: DraftField = {
            _uid: uid(),
            key: slugify(label, existingKeys),
            label,
            type,
            required: false,
            options: OPTION_FIELD_TYPES.includes(type)
                ? ['Option 1', 'Option 2']
                : undefined,
            max_rating: type === 'rating' ? 5 : undefined,
        };

        updatePageFields(activePage._uid, [...activePage.fields, newField]);
    }

    function addPage() {
        const newPage: DraftPage = {
            _uid: uid(),
            key: `page-${uid().slice(0, 8)}`,
            title: `Page ${pages.length + 1}`,
            fields: [],
        };
        setPages([...pages, newPage]);
        setActiveUid(newPage._uid);
    }

    function handleSave() {
        const allFields = pages.flatMap((p) => p.fields);
        const keys = allFields.map((f) => f.key);

        if (!details.name.trim()) {
            toast.error('Give this category a name first.');

            return;
        }

        if (new Set(keys).size !== keys.length) {
            toast.error(
                'Two fields are using the same key — field keys must be unique.',
            );

            return;
        }

        if (allFields.some((f) => !f.key.trim() || !f.label.trim())) {
            toast.error('Every field needs both a label and a key.');

            return;
        }

        const emptyChoiceField = allFields.find(
            (f) =>
                OPTION_FIELD_TYPES.includes(f.type) &&
                cleanOptions(f.options).length === 0,
        );

        if (emptyChoiceField) {
            toast.error(
                `"${emptyChoiceField.label}" needs at least one option.`,
            );

            return;
        }

        // Cast: form_pages/form_branding/form_settings are plain JSON-serializable
        // objects, but their literal-union style types don't structurally satisfy
        // Inertia's FormDataConvertible index signature.
        const payload = {
            name: details.name,
            subject_type: details.subject_type,
            price: details.price || null,
            quota: details.quota || null,
            registration_open: details.registration_open,
            form_pages: pages.map((page) => ({
                key: page.key,
                title: page.title,
                description: page.description,
                fields: page.fields.map((field) => {
                    const { _uid, ...rest } = field;
                    void _uid;

                    return OPTION_FIELD_TYPES.includes(rest.type)
                        ? { ...rest, options: cleanOptions(rest.options) }
                        : rest;
                }),
            })),
            form_branding: branding,
            form_settings: settings,
        } as unknown as Record<string, FormDataConvertible>;

        const options = {
            preserveScroll: true,
            onStart: () => setIsSaving(true),
            onFinish: () => setIsSaving(false),
            onError: () =>
                toast.error("Couldn't save — check the form for errors."),
        };

        if (isEditing && registrationCategory) {
            router.put(
                `/dashboard/events/${event.id}/registration-categories/${registrationCategory.id}`,
                payload,
                options,
            );
        } else {
            router.post(
                `/dashboard/events/${event.id}/registration-categories`,
                payload,
                options,
            );
        }
    }

    const fieldOptions = [
        ...DUPLICATE_FIELD_RESERVED_OPTIONS,
        ...pages.flatMap((p) =>
            p.fields.map((f) => ({ value: f.key, label: f.label || f.key })),
        ),
    ];

    if (showTemplates) {
        return (
            <div className="mx-auto flex h-full w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-6 md:px-8 md:py-8">
                <Head title={`New Registration Category · ${event.name}`} />

                <div className="flex items-center gap-4">
                    <Button
                        variant="outline"
                        size="icon"
                        className="h-10 w-10 shrink-0"
                        asChild
                    >
                        <Link
                            href={`/dashboard/events/${event.id}/registration-categories`}
                            aria-label="Back to registration categories"
                        >
                            <ChevronLeft className="h-5 w-5" />
                        </Link>
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">
                            Choose a starting point
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            Pick a template to seed your form, or start from a
                            blank page.
                        </p>
                    </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                    {FORM_TEMPLATES.map((template) => (
                        <button
                            key={template.key}
                            type="button"
                            onClick={() => applyTemplate(template)}
                            className="rounded-lg border p-4 text-left hover:border-primary hover:bg-primary/5"
                        >
                            <p className="text-sm font-semibold">
                                {template.name}
                            </p>
                            <p className="mt-1 text-xs text-muted-foreground">
                                {template.description}
                            </p>
                        </button>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="mx-auto flex h-full w-full max-w-7xl flex-1 flex-col gap-4 px-4 py-6 md:px-8 md:py-8">
            <Head
                title={`${isEditing ? 'Edit' : 'New'} Registration Category · ${event.name}`}
            />

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
                <div className="flex min-w-0 items-center gap-3 sm:gap-4">
                    <Button
                        variant="outline"
                        size="icon"
                        className="h-10 w-10 shrink-0"
                        asChild
                    >
                        <Link
                            href={`/dashboard/events/${event.id}/registration-categories`}
                            aria-label="Back to registration categories"
                        >
                            <ChevronLeft className="h-5 w-5" />
                        </Link>
                    </Button>
                    <div className="min-w-0 flex-1">
                        <h1 className="truncate text-xl font-bold tracking-tight sm:text-2xl">
                            {details.name || 'Untitled category'}
                        </h1>
                        <p className="truncate text-sm text-muted-foreground">
                            {event.name}
                        </p>
                    </div>
                </div>
                <Button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="w-full shrink-0 sm:ml-auto sm:w-auto"
                >
                    {isSaving && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    {isSaving
                        ? 'Saving…'
                        : isEditing
                          ? 'Save changes'
                          : 'Create category'}
                </Button>
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-[220px_1fr_360px]">
                <div className="rounded-lg border p-3 lg:h-fit">
                    <FieldPalette onAdd={addField} disabled={!activePage} />
                </div>

                <div className="min-w-0 space-y-3 rounded-lg border p-3">
                    <PageTabs
                        pages={pages}
                        activeUid={activeUid}
                        onSelect={setActiveUid}
                        onChange={setPages}
                        onAdd={addPage}
                    />

                    {activePage ? (
                        <FieldList
                            fields={activePage.fields}
                            onChange={(fields) =>
                                updatePageFields(activePage._uid, fields)
                            }
                        />
                    ) : (
                        <p className="rounded-md border border-dashed py-8 text-center text-sm text-muted-foreground">
                            Add a page to get started.
                        </p>
                    )}
                </div>

                <div className="rounded-lg border p-3 lg:h-fit">
                    <SettingsPanel
                        event={event}
                        registrationCategoryId={
                            registrationCategory?.id ?? null
                        }
                        isEditingSubjectType={isEditing}
                        details={details}
                        onDetailsChange={(patch) =>
                            setDetails((d) => ({ ...d, ...patch }))
                        }
                        branding={branding}
                        onBrandingChange={(patch) =>
                            setBranding((b) => ({ ...b, ...patch }))
                        }
                        settings={settings}
                        onSettingsChange={(patch) =>
                            setSettings((s) => ({ ...s, ...patch }))
                        }
                        fieldOptions={fieldOptions}
                    />
                </div>
            </div>
        </div>
    );
}
