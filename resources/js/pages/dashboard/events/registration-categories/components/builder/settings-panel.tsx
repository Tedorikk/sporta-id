import { Check, Copy, Plus, X } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Field,
    FieldDescription,
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
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import type { Event } from '@/types/event';
import type {
    FormBranding,
    FormSettings,
    PaymentMethod,
    RegistrationSubjectType,
} from '@/types/registration-category';
import {
    FONT_FAMILY_OPTIONS,
    RESERVED_FIELD_KEYS,
    THEME_PRESETS,
} from '@/types/registration-category';
import type { RunningEventCategory } from '@/types/running-event-category';
import type { TournamentDraft } from './tournament-settings';
import { TournamentSettingsFields } from './tournament-settings';

interface DetailsValue {
    name: string;
    subject_type: RegistrationSubjectType;
    price: string;
    payment_method: PaymentMethod;
    quota: string;
    registration_open: boolean;
    running_event_category_id: string;
}

/** Only offered on basketball events, and only to team categories. */
interface TournamentValue {
    enabled: boolean;
    lockedOn: boolean;
    draft: TournamentDraft;
    onEnabledChange: (enabled: boolean) => void;
    onChange: (patch: Partial<TournamentDraft>) => void;
}

interface SettingsPanelProps {
    event: Event;
    registrationCategoryId: number | null;
    isEditingSubjectType: boolean;
    details: DetailsValue;
    onDetailsChange: (patch: Partial<DetailsValue>) => void;
    /** Every distance on this event, when it's a running event — for the "sells entries to" picker. */
    runningCategories:
        | Pick<RunningEventCategory, 'id' | 'name' | 'distance_meters'>[]
        | null;
    tournament: TournamentValue | null;
    branding: FormBranding;
    onBrandingChange: (patch: Partial<FormBranding>) => void;
    settings: FormSettings;
    onSettingsChange: (patch: Partial<FormSettings>) => void;
    fieldOptions: { value: string; label: string }[];
}

function ColorField({
    label,
    value,
    onChange,
}: {
    label: string;
    value: string | null | undefined;
    onChange: (value: string) => void;
}) {
    return (
        <Field>
            <FieldLabel>{label}</FieldLabel>
            <div className="flex items-center gap-2">
                <input
                    type="color"
                    value={value || '#ffffff'}
                    onChange={(e) => onChange(e.target.value)}
                    className="h-9 w-9 shrink-0 cursor-pointer rounded-md border"
                    aria-label={label}
                />
                <Input
                    value={value ?? ''}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder="#ffffff"
                    className="font-mono text-xs"
                />
            </div>
        </Field>
    );
}

function BrandingTab({
    branding,
    onBrandingChange,
}: {
    branding: FormBranding;
    onBrandingChange: (patch: Partial<FormBranding>) => void;
}) {
    const radius =
        branding.border_radius === 'pill'
            ? '9999px'
            : branding.border_radius === 'sharp'
              ? '2px'
              : '10px';

    return (
        <FieldGroup className="py-2">
            <Field>
                <FieldLabel>Theme presets</FieldLabel>
                <div className="flex flex-wrap gap-2">
                    {THEME_PRESETS.map((preset) => (
                        <button
                            key={preset.name}
                            type="button"
                            onClick={() => onBrandingChange(preset.branding)}
                            className="flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs hover:bg-muted"
                        >
                            <span
                                className="h-3 w-3 rounded-full"
                                style={{
                                    background:
                                        preset.branding.primary_color ?? '#ccc',
                                }}
                            />
                            {preset.name}
                        </button>
                    ))}
                </div>
            </Field>

            <div
                className="flex items-center justify-between rounded-lg border-2 border-black p-4"
                style={{
                    background: branding.background_color || '#ffffff',
                    color: branding.text_color || '#171717',
                    fontFamily: branding.font_family || undefined,
                }}
            >
                <span className="text-sm font-semibold">
                    {branding.button_label || 'Register'}
                </span>
                <span
                    className="rounded px-3 py-1.5 text-xs font-bold tracking-wide text-white uppercase"
                    style={{
                        background: branding.primary_color || '#171717',
                        borderRadius: radius,
                    }}
                >
                    {branding.button_label || 'Register'}
                </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
                <ColorField
                    label="Primary color"
                    value={branding.primary_color}
                    onChange={(v) => onBrandingChange({ primary_color: v })}
                />
                <ColorField
                    label="Secondary color"
                    value={branding.secondary_color}
                    onChange={(v) => onBrandingChange({ secondary_color: v })}
                />
                <ColorField
                    label="Background color"
                    value={branding.background_color}
                    onChange={(v) => onBrandingChange({ background_color: v })}
                />
                <ColorField
                    label="Text color"
                    value={branding.text_color}
                    onChange={(v) => onBrandingChange({ text_color: v })}
                />
            </div>

            <Field>
                <FieldLabel>Logo URL</FieldLabel>
                <Input
                    value={branding.logo_url ?? ''}
                    onChange={(e) =>
                        onBrandingChange({ logo_url: e.target.value })
                    }
                    placeholder="https://…"
                />
            </Field>

            <div className="grid grid-cols-2 gap-3">
                <Field>
                    <FieldLabel>Font</FieldLabel>
                    <Select
                        value={branding.font_family || 'default'}
                        onValueChange={(value) =>
                            onBrandingChange({
                                font_family: value === 'default' ? null : value,
                            })
                        }
                    >
                        <SelectTrigger className="w-full">
                            <SelectValue placeholder="Default" />
                        </SelectTrigger>
                        <SelectContent>
                            {FONT_FAMILY_OPTIONS.map((f) => (
                                <SelectItem
                                    key={f.value}
                                    value={f.value || 'default'}
                                >
                                    {f.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </Field>
                <Field>
                    <FieldLabel>Corners</FieldLabel>
                    <Select
                        value={branding.border_radius ?? 'rounded'}
                        onValueChange={(value) =>
                            onBrandingChange({
                                border_radius:
                                    value as FormBranding['border_radius'],
                            })
                        }
                    >
                        <SelectTrigger className="w-full">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="sharp">Sharp</SelectItem>
                            <SelectItem value="rounded">Rounded</SelectItem>
                            <SelectItem value="pill">Pill</SelectItem>
                        </SelectContent>
                    </Select>
                </Field>
            </div>

            <Field>
                <FieldLabel>Submit button label</FieldLabel>
                <Input
                    value={branding.button_label ?? ''}
                    onChange={(e) =>
                        onBrandingChange({ button_label: e.target.value })
                    }
                    placeholder="Register"
                />
            </Field>
        </FieldGroup>
    );
}

function NotifyEmailsField({
    settings,
    onSettingsChange,
}: {
    settings: FormSettings;
    onSettingsChange: (patch: Partial<FormSettings>) => void;
}) {
    const [draft, setDraft] = useState('');
    const emails = settings.notify_emails ?? [];

    function addEmail() {
        const value = draft.trim();

        if (!value || emails.includes(value)) {
            setDraft('');

            return;
        }

        onSettingsChange({ notify_emails: [...emails, value] });
        setDraft('');
    }

    return (
        <Field>
            <FieldLabel>Notify by email</FieldLabel>
            <FieldDescription>
                Sends a copy of every new response to these addresses.
            </FieldDescription>
            <div className="flex flex-wrap gap-1.5">
                {emails.map((email) => (
                    <Badge key={email} variant="secondary" className="gap-1">
                        {email}
                        <button
                            type="button"
                            onClick={() =>
                                onSettingsChange({
                                    notify_emails: emails.filter(
                                        (e) => e !== email,
                                    ),
                                })
                            }
                            aria-label={`Remove ${email}`}
                        >
                            <X className="h-3 w-3" />
                        </button>
                    </Badge>
                ))}
            </div>
            <div className="flex gap-2">
                <Input
                    type="email"
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                            e.preventDefault();
                            addEmail();
                        }
                    }}
                    placeholder="organizer@example.com"
                />
                <Button type="button" variant="outline" onClick={addEmail}>
                    <Plus className="h-4 w-4" />
                </Button>
            </div>
        </Field>
    );
}

function EmbedTab({
    event,
    registrationCategoryId,
}: {
    event: Event;
    registrationCategoryId: number | null;
}) {
    const [copied, setCopied] = useState<'link' | 'iframe' | null>(null);

    if (!registrationCategoryId) {
        return (
            <p className="py-6 text-center text-sm text-muted-foreground">
                Save this category to get its public link and embed code.
            </p>
        );
    }

    const url = `${window.location.origin}/events/${event.id}/registration-categories/${registrationCategoryId}/register`;
    const iframe = `<iframe src="${url}" width="100%" height="800" frameborder="0"></iframe>`;

    function copy(text: string, which: 'link' | 'iframe') {
        navigator.clipboard.writeText(text);
        setCopied(which);
        toast.success('Copied to clipboard');
        setTimeout(() => setCopied(null), 1500);
    }

    return (
        <FieldGroup className="py-2">
            <Field>
                <FieldLabel>Public link</FieldLabel>
                <div className="flex gap-2">
                    <Input readOnly value={url} className="font-mono text-xs" />
                    <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => copy(url, 'link')}
                    >
                        {copied === 'link' ? (
                            <Check className="h-4 w-4" />
                        ) : (
                            <Copy className="h-4 w-4" />
                        )}
                    </Button>
                </div>
            </Field>
            <Field>
                <FieldLabel>Embed (iframe)</FieldLabel>
                <Textarea
                    readOnly
                    value={iframe}
                    className="min-h-20 font-mono text-xs"
                />
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => copy(iframe, 'iframe')}
                    className="w-fit"
                >
                    {copied === 'iframe' ? (
                        <Check className="mr-1.5 h-3.5 w-3.5" />
                    ) : (
                        <Copy className="mr-1.5 h-3.5 w-3.5" />
                    )}
                    Copy embed code
                </Button>
            </Field>
        </FieldGroup>
    );
}

export function SettingsPanel({
    event,
    registrationCategoryId,
    isEditingSubjectType,
    details,
    onDetailsChange,
    runningCategories,
    tournament,
    branding,
    onBrandingChange,
    settings,
    onSettingsChange,
    fieldOptions,
}: SettingsPanelProps) {
    return (
        <Tabs defaultValue="details" className="w-full">
            <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="details">Details</TabsTrigger>
                <TabsTrigger value="branding">Branding</TabsTrigger>
                <TabsTrigger value="validation">Validation</TabsTrigger>
                <TabsTrigger value="notifications">Notify</TabsTrigger>
                <TabsTrigger value="embed">Embed</TabsTrigger>
            </TabsList>

            <TabsContent value="details">
                <FieldGroup className="py-2">
                    <Field>
                        <FieldLabel>Name</FieldLabel>
                        <Input
                            value={details.name}
                            onChange={(e) =>
                                onDetailsChange({ name: e.target.value })
                            }
                            placeholder="e.g. 5K Run, Men's Division A"
                        />
                    </Field>

                    <div className="grid grid-cols-2 gap-3">
                        <Field>
                            <FieldLabel>Who registers</FieldLabel>
                            <Select
                                value={details.subject_type}
                                onValueChange={(value) =>
                                    onDetailsChange({
                                        subject_type:
                                            value as RegistrationSubjectType,
                                    })
                                }
                                disabled={isEditingSubjectType}
                            >
                                <SelectTrigger className="w-full">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="team">A team</SelectItem>
                                    <SelectItem value="individual">
                                        An individual
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </Field>
                        <Field
                            orientation="horizontal"
                            className="items-center pt-6"
                        >
                            <Switch
                                checked={details.registration_open}
                                onCheckedChange={(checked) =>
                                    onDetailsChange({
                                        registration_open: checked,
                                    })
                                }
                            />
                            <FieldLabel className="font-normal">
                                Open
                            </FieldLabel>
                        </Field>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <Field>
                            <FieldLabel>Price (blank = free)</FieldLabel>
                            <Input
                                type="number"
                                min={0}
                                step="0.01"
                                value={details.price}
                                onChange={(e) =>
                                    onDetailsChange({ price: e.target.value })
                                }
                                placeholder="0"
                            />
                        </Field>
                        <Field>
                            <FieldLabel>Quota (blank = unlimited)</FieldLabel>
                            <Input
                                type="number"
                                min={1}
                                step="1"
                                value={details.quota}
                                onChange={(e) =>
                                    onDetailsChange({ quota: e.target.value })
                                }
                                placeholder="Unlimited"
                            />
                        </Field>
                    </div>

                    {Number(details.price) > 0 && (
                        <Field>
                            <FieldLabel>Payment method</FieldLabel>
                            <Select
                                value={details.payment_method}
                                onValueChange={(value) =>
                                    onDetailsChange({
                                        payment_method: value as PaymentMethod,
                                    })
                                }
                            >
                                <SelectTrigger className="w-full">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="online">
                                        Online checkout (card, e-wallet, etc.)
                                    </SelectItem>
                                    <SelectItem value="manual_transfer">
                                        Manual transfer — registrant uploads
                                        proof
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                            {details.payment_method === 'manual_transfer' && (
                                <FieldDescription>
                                    No Midtrans transaction is created.
                                    Registrants see your instructions below,
                                    upload a transfer screenshot, and you
                                    verify it from the registrations list.
                                </FieldDescription>
                            )}
                        </Field>
                    )}

                    {Number(details.price) > 0 &&
                        details.payment_method === 'manual_transfer' && (
                            <Field>
                                <FieldLabel>
                                    Payment instructions
                                </FieldLabel>
                                <Textarea
                                    value={
                                        settings.manual_payment_instructions ??
                                        ''
                                    }
                                    onChange={(e) =>
                                        onSettingsChange({
                                            manual_payment_instructions:
                                                e.target.value,
                                        })
                                    }
                                    placeholder="e.g. Transfer to BCA 1234567890 (a/n Sporta Indonesia), then upload your receipt below."
                                    className="min-h-20"
                                />
                            </Field>
                        )}

                    {runningCategories && details.subject_type === 'individual' && (
                        <Field>
                            <FieldLabel htmlFor="running_event_category_id">
                                Sells entries to
                            </FieldLabel>
                            <Select
                                value={
                                    details.running_event_category_id || 'none'
                                }
                                onValueChange={(value) =>
                                    onDetailsChange({
                                        running_event_category_id:
                                            value === 'none' ? '' : value,
                                    })
                                }
                            >
                                <SelectTrigger
                                    id="running_event_category_id"
                                    className="w-full"
                                >
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">
                                        No distance — a plain sign-up
                                    </SelectItem>
                                    {runningCategories.map((category) => (
                                        <SelectItem
                                            key={category.id}
                                            value={String(category.id)}
                                        >
                                            {category.name} (
                                            {(
                                                category.distance_meters / 1000
                                            ).toFixed(
                                                category.distance_meters %
                                                    1000 ===
                                                    0
                                                    ? 0
                                                    : 1,
                                            )}
                                            km)
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <FieldDescription>
                                Several categories (with/without jersey,
                                early bird) can sell the same distance —
                                confirmed entrants all land on its one start
                                list.
                            </FieldDescription>
                        </Field>
                    )}

                    {tournament && details.subject_type === 'team' && (
                        <TournamentSettingsFields
                            enabled={tournament.enabled}
                            lockedOn={tournament.lockedOn}
                            onEnabledChange={tournament.onEnabledChange}
                            draft={tournament.draft}
                            onChange={tournament.onChange}
                        />
                    )}
                </FieldGroup>
            </TabsContent>

            <TabsContent value="branding">
                <BrandingTab
                    branding={branding}
                    onBrandingChange={onBrandingChange}
                />
            </TabsContent>

            <TabsContent value="validation">
                <FieldGroup className="py-2">
                    <Field>
                        <FieldLabel>Prevent duplicate responses by</FieldLabel>
                        <FieldDescription>
                            Blocks a second submission that reuses the same
                            value for this field.
                        </FieldDescription>
                        <Select
                            value={settings.prevent_duplicate_by ?? 'none'}
                            onValueChange={(value) =>
                                onSettingsChange({
                                    prevent_duplicate_by:
                                        value === 'none' ? null : value,
                                })
                            }
                        >
                            <SelectTrigger className="w-full">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="none">
                                    Don't prevent duplicates
                                </SelectItem>
                                {fieldOptions.map((f) => (
                                    <SelectItem key={f.value} value={f.value}>
                                        {f.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </Field>

                    <Field>
                        <FieldLabel>After submitting, show</FieldLabel>
                        <FieldDescription>
                            The confirmation email always goes out either
                            way — this only controls what the registrant
                            sees on screen.
                        </FieldDescription>
                        <Select
                            value={settings.post_submit_display ?? 'id_card'}
                            onValueChange={(value) =>
                                onSettingsChange({
                                    post_submit_display:
                                        value as FormSettings['post_submit_display'],
                                })
                            }
                        >
                            <SelectTrigger className="w-full">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="id_card">
                                    The ID card
                                </SelectItem>
                                <SelectItem value="message">
                                    Just the message below
                                </SelectItem>
                            </SelectContent>
                        </Select>
                    </Field>

                    <Field>
                        <FieldLabel>Confirmation message</FieldLabel>
                        <FieldDescription>
                            Shown after a successful submission and included in
                            the registrant confirmation email.
                        </FieldDescription>
                        <Textarea
                            value={settings.confirmation_message ?? ''}
                            onChange={(e) =>
                                onSettingsChange({
                                    confirmation_message: e.target.value,
                                })
                            }
                            placeholder="Example: Please bring your ID and arrive 30 minutes before check-in."
                            className="min-h-20"
                        />
                    </Field>

                    <Field>
                        <FieldLabel>Confirmation email subject</FieldLabel>
                        <FieldDescription>
                            Optional. Supports placeholders like {'{event}'},{' '}
                            {'{category}'}, and {'{name}'}.
                        </FieldDescription>
                        <Input
                            value={settings.confirmation_email_subject ?? ''}
                            onChange={(e) =>
                                onSettingsChange({
                                    confirmation_email_subject: e.target.value,
                                })
                            }
                            placeholder="Example: Your ticket for {event}"
                        />
                    </Field>

                    <Field>
                        <FieldLabel>Confirmation email body</FieldLabel>
                        <FieldDescription>
                            Optional. Replaces the default greeting and event
                            details. Available placeholders: {'{name}'},{' '}
                            {'{event}'}, {'{category}'}, {'{event_dates}'},{' '}
                            {'{id_card_url}'}, {'{status_url}'}.
                        </FieldDescription>
                        <Textarea
                            value={settings.confirmation_email_body ?? ''}
                            onChange={(e) =>
                                onSettingsChange({
                                    confirmation_email_body: e.target.value,
                                })
                            }
                            placeholder={
                                'Hi {name},\n\nYour registration for {event} is confirmed.\nCategory: {category}\nEvent dates: {event_dates}'
                            }
                            className="min-h-32"
                        />
                    </Field>
                </FieldGroup>
            </TabsContent>

            <TabsContent value="notifications">
                <FieldGroup className="py-2">
                    <NotifyEmailsField
                        settings={settings}
                        onSettingsChange={onSettingsChange}
                    />
                </FieldGroup>
            </TabsContent>

            <TabsContent value="embed">
                <EmbedTab
                    event={event}
                    registrationCategoryId={registrationCategoryId}
                />
            </TabsContent>
        </Tabs>
    );
}

export const DUPLICATE_FIELD_RESERVED_OPTIONS = RESERVED_FIELD_KEYS.filter(
    (k) => k !== 'photo' && k !== 'name',
).map((k) => ({
    value: k,
    label: k[0].toUpperCase() + k.slice(1),
}));
