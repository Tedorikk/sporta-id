export type RegistrationSubjectType = 'team' | 'individual';

export type RegistrationFieldType =
    | 'text'
    | 'number'
    | 'email'
    | 'phone'
    | 'date'
    | 'select'
    | 'radio'
    | 'checkbox'
    | 'textarea'
    | 'rating'
    | 'signature'
    | 'file'
    | 'document';

export interface RegistrationField {
    key: string;
    label: string;
    type: RegistrationFieldType;
    required: boolean;
    options?: string[];
    help_text?: string | null;
    /** number type only */
    min?: number | null;
    max?: number | null;
    /** rating type only — defaults to 5 when unset */
    max_rating?: number | null;
    /** Overrides the generic "required" validation message for this field. */
    error_message?: string | null;
}

export interface FormPage {
    key: string;
    title: string;
    description?: string | null;
    fields: RegistrationField[];
}

export interface FormBranding {
    primary_color?: string | null;
    secondary_color?: string | null;
    background_color?: string | null;
    text_color?: string | null;
    logo_url?: string | null;
    font_family?: string | null;
    border_radius?: 'sharp' | 'rounded' | 'pill' | null;
    button_label?: string | null;
}

export interface FormSettings {
    prevent_duplicate_by?: string | null;
    confirmation_message?: string | null;
    notify_emails?: string[];
}

export interface RegistrationCategory {
    id: number;
    event_id: number;
    name: string;
    slug: string;
    subject_type: RegistrationSubjectType;
    price: string | null;
    quota: number | null;
    registered_count: number;
    registration_open: boolean;
    opens_at: string | null;
    closes_at: string | null;
    form_pages: FormPage[] | null;
    form_branding: FormBranding | null;
    form_settings: FormSettings | null;
    status: string;
    registrations_count?: number;
}

/**
 * A category as the public event page sees it — still listed (with its price)
 * when registration is closed or full, but flagged so the card renders as a
 * disabled row instead of a link into a form that would only reject you.
 */
export interface PublicRegistrationCategory extends RegistrationCategory {
    is_available: boolean;
    unavailable_reason: 'closed' | 'full' | null;
    slots_left: number | null;
}

export const REGISTRATION_FIELD_TYPES: { value: RegistrationFieldType; label: string }[] = [
    { value: 'text', label: 'Text' },
    { value: 'number', label: 'Number' },
    { value: 'email', label: 'Email' },
    { value: 'phone', label: 'Phone' },
    { value: 'date', label: 'Date' },
    { value: 'select', label: 'Dropdown' },
    { value: 'radio', label: 'Multiple choice' },
    { value: 'checkbox', label: 'Checkbox' },
    { value: 'textarea', label: 'Long text' },
    { value: 'rating', label: 'Rating' },
    { value: 'signature', label: 'Signature' },
    { value: 'file', label: 'Photo upload' },
    { value: 'document', label: 'Document upload (PDF, Word)' },
];

/** Field types where `options` (comma-separated choices) apply. */
export const OPTION_FIELD_TYPES: RegistrationFieldType[] = ['select', 'radio'];

/** Mirrors RegistrationController::RESERVED_KEYS — these already have dedicated fixed bindings. */
export const RESERVED_FIELD_KEYS = ['name', 'email', 'phone', 'photo'];

export const FONT_FAMILY_OPTIONS: { value: string; label: string }[] = [
    { value: '', label: 'Default' },
    { value: "'Inter', sans-serif", label: 'Inter' },
    { value: "'Poppins', sans-serif", label: 'Poppins' },
    { value: "'Roboto', sans-serif", label: 'Roboto' },
    { value: "'Playfair Display', serif", label: 'Playfair Display' },
    { value: "'Georgia', serif", label: 'Georgia' },
    { value: "'Courier New', monospace", label: 'Courier New' },
];

export interface ThemePreset {
    name: string;
    branding: FormBranding;
}

export const THEME_PRESETS: ThemePreset[] = [
    {
        name: 'Classic',
        branding: { primary_color: '#f97316', secondary_color: '#c2410c', background_color: '#ffffff', text_color: '#171717', border_radius: 'rounded' },
    },
    {
        name: 'Ocean',
        branding: { primary_color: '#0ea5e9', secondary_color: '#0369a1', background_color: '#ffffff', text_color: '#0c1a24', border_radius: 'rounded' },
    },
    {
        name: 'Forest',
        branding: { primary_color: '#16a34a', secondary_color: '#166534', background_color: '#ffffff', text_color: '#14201a', border_radius: 'sharp' },
    },
    {
        name: 'Berry',
        branding: { primary_color: '#db2777', secondary_color: '#9d174d', background_color: '#ffffff', text_color: '#22131a', border_radius: 'pill', font_family: "'Poppins', sans-serif" },
    },
    {
        name: 'Slate',
        branding: { primary_color: '#475569', secondary_color: '#1e293b', background_color: '#f8fafc', text_color: '#0f172a', border_radius: 'sharp', font_family: "'Georgia', serif" },
    },
];
