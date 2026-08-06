import { Check, Copy, Plus, X } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Field, FieldDescription, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import type { Event } from '@/types/event';
import type { FormBranding, FormSettings, RegistrationSubjectType } from '@/types/registration-category';
import { FONT_FAMILY_OPTIONS, RESERVED_FIELD_KEYS, THEME_PRESETS } from '@/types/registration-category';

interface DetailsValue {
    name: string;
    subject_type: RegistrationSubjectType;
    price: string;
    quota: string;
    registration_open: boolean;
}

interface SettingsPanelProps {
    event: Event;
    registrationCategoryId: number | null;
    isEditingSubjectType: boolean;
    details: DetailsValue;
    onDetailsChange: (patch: Partial<DetailsValue>) => void;
    branding: FormBranding;
    onBrandingChange: (patch: Partial<FormBranding>) => void;
    settings: FormSettings;
    onSettingsChange: (patch: Partial<FormSettings>) => void;
    fieldOptions: { value: string; label: string }[];
}

function ColorField({ label, value, onChange }: { label: string; value: string | null | undefined; onChange: (value: string) => void }) {
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
                <Input value={value ?? ''} onChange={(e) => onChange(e.target.value)} placeholder="#ffffff" className="font-mono text-xs" />
            </div>
        </Field>
    );
}

function BrandingTab({ branding, onBrandingChange }: { branding: FormBranding; onBrandingChange: (patch: Partial<FormBranding>) => void }) {
    const radius = branding.border_radius === 'pill' ? '9999px' : branding.border_radius === 'sharp' ? '2px' : '10px';

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
                            <span className="h-3 w-3 rounded-full" style={{ background: preset.branding.primary_color ?? '#ccc' }} />
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
                <span className="text-sm font-semibold">{branding.button_label || 'Register'}</span>
                <span
                    className="rounded px-3 py-1.5 text-xs font-bold tracking-wide text-white uppercase"
                    style={{ background: branding.primary_color || '#171717', borderRadius: radius }}
                >
                    {branding.button_label || 'Register'}
                </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
                <ColorField label="Primary color" value={branding.primary_color} onChange={(v) => onBrandingChange({ primary_color: v })} />
                <ColorField label="Secondary color" value={branding.secondary_color} onChange={(v) => onBrandingChange({ secondary_color: v })} />
                <ColorField label="Background color" value={branding.background_color} onChange={(v) => onBrandingChange({ background_color: v })} />
                <ColorField label="Text color" value={branding.text_color} onChange={(v) => onBrandingChange({ text_color: v })} />
            </div>

            <Field>
                <FieldLabel>Logo URL</FieldLabel>
                <Input value={branding.logo_url ?? ''} onChange={(e) => onBrandingChange({ logo_url: e.target.value })} placeholder="https://…" />
            </Field>

            <div className="grid grid-cols-2 gap-3">
                <Field>
                    <FieldLabel>Font</FieldLabel>
                    <Select
                        value={branding.font_family || 'default'}
                        onValueChange={(value) => onBrandingChange({ font_family: value === 'default' ? null : value })}
                    >
                        <SelectTrigger className="w-full">
                            <SelectValue placeholder="Default" />
                        </SelectTrigger>
                        <SelectContent>
                            {FONT_FAMILY_OPTIONS.map((f) => (
                                <SelectItem key={f.value} value={f.value || 'default'}>
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
                        onValueChange={(value) => onBrandingChange({ border_radius: value as FormBranding['border_radius'] })}
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
                <Input value={branding.button_label ?? ''} onChange={(e) => onBrandingChange({ button_label: e.target.value })} placeholder="Register" />
            </Field>
        </FieldGroup>
    );
}

function NotifyEmailsField({ settings, onSettingsChange }: { settings: FormSettings; onSettingsChange: (patch: Partial<FormSettings>) => void }) {
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
            <FieldDescription>Sends a copy of every new response to these addresses.</FieldDescription>
            <div className="flex flex-wrap gap-1.5">
                {emails.map((email) => (
                    <Badge key={email} variant="secondary" className="gap-1">
                        {email}
                        <button type="button" onClick={() => onSettingsChange({ notify_emails: emails.filter((e) => e !== email) })} aria-label={`Remove ${email}`}>
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

function EmbedTab({ event, registrationCategoryId }: { event: Event; registrationCategoryId: number | null }) {
    const [copied, setCopied] = useState<'link' | 'iframe' | null>(null);

    if (!registrationCategoryId) {
        return <p className="py-6 text-center text-sm text-muted-foreground">Save this category to get its public link and embed code.</p>;
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
                    <Button type="button" variant="outline" size="icon" onClick={() => copy(url, 'link')}>
                        {copied === 'link' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                </div>
            </Field>
            <Field>
                <FieldLabel>Embed (iframe)</FieldLabel>
                <Textarea readOnly value={iframe} className="min-h-20 font-mono text-xs" />
                <Button type="button" variant="outline" size="sm" onClick={() => copy(iframe, 'iframe')} className="w-fit">
                    {copied === 'iframe' ? <Check className="mr-1.5 h-3.5 w-3.5" /> : <Copy className="mr-1.5 h-3.5 w-3.5" />}
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
                        <Input value={details.name} onChange={(e) => onDetailsChange({ name: e.target.value })} placeholder="e.g. 5K Run, Men's Division A" />
                    </Field>

                    <div className="grid grid-cols-2 gap-3">
                        <Field>
                            <FieldLabel>Who registers</FieldLabel>
                            <Select
                                value={details.subject_type}
                                onValueChange={(value) => onDetailsChange({ subject_type: value as RegistrationSubjectType })}
                                disabled={isEditingSubjectType}
                            >
                                <SelectTrigger className="w-full">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="team">A team</SelectItem>
                                    <SelectItem value="individual">An individual</SelectItem>
                                </SelectContent>
                            </Select>
                        </Field>
                        <Field orientation="horizontal" className="items-center pt-6">
                            <Switch checked={details.registration_open} onCheckedChange={(checked) => onDetailsChange({ registration_open: checked })} />
                            <FieldLabel className="font-normal">Open</FieldLabel>
                        </Field>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <Field>
                            <FieldLabel>Price (blank = free)</FieldLabel>
                            <Input type="number" min={0} step="0.01" value={details.price} onChange={(e) => onDetailsChange({ price: e.target.value })} placeholder="0" />
                        </Field>
                        <Field>
                            <FieldLabel>Quota (blank = unlimited)</FieldLabel>
                            <Input type="number" min={1} step="1" value={details.quota} onChange={(e) => onDetailsChange({ quota: e.target.value })} placeholder="Unlimited" />
                        </Field>
                    </div>
                </FieldGroup>
            </TabsContent>

            <TabsContent value="branding">
                <BrandingTab branding={branding} onBrandingChange={onBrandingChange} />
            </TabsContent>

            <TabsContent value="validation">
                <FieldGroup className="py-2">
                    <Field>
                        <FieldLabel>Prevent duplicate responses by</FieldLabel>
                        <FieldDescription>Blocks a second submission that reuses the same value for this field.</FieldDescription>
                        <Select
                            value={settings.prevent_duplicate_by ?? 'none'}
                            onValueChange={(value) => onSettingsChange({ prevent_duplicate_by: value === 'none' ? null : value })}
                        >
                            <SelectTrigger className="w-full">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="none">Don't prevent duplicates</SelectItem>
                                {fieldOptions.map((f) => (
                                    <SelectItem key={f.value} value={f.value}>
                                        {f.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </Field>

                    <Field>
                        <FieldLabel>Confirmation message</FieldLabel>
                        <Textarea
                            value={settings.confirmation_message ?? ''}
                            onChange={(e) => onSettingsChange({ confirmation_message: e.target.value })}
                            placeholder="Shown after a successful submission"
                            className="min-h-20"
                        />
                    </Field>
                </FieldGroup>
            </TabsContent>

            <TabsContent value="notifications">
                <FieldGroup className="py-2">
                    <NotifyEmailsField settings={settings} onSettingsChange={onSettingsChange} />
                </FieldGroup>
            </TabsContent>

            <TabsContent value="embed">
                <EmbedTab event={event} registrationCategoryId={registrationCategoryId} />
            </TabsContent>
        </Tabs>
    );
}

export const DUPLICATE_FIELD_RESERVED_OPTIONS = RESERVED_FIELD_KEYS.filter((k) => k !== 'photo' && k !== 'name').map((k) => ({
    value: k,
    label: k[0].toUpperCase() + k.slice(1),
}));
