import type { PlayerRole } from './player';

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
    | 'document'
    | 'description'
    | 'roster';

/** One role on a roster block and how many of it a team must/may enter. */
export interface RosterSlot {
    role: PlayerRole;
    label: string;
    min: number;
    /** null = no cap (players still respect the tournament's max_player_per_team) */
    max: number | null;
}

/** Mirrors RegistrationCategory::IMAGE_RATIOS. */
export type ImageRatio = 'portrait' | 'square' | 'landscape';

export const IMAGE_RATIOS: {
    value: ImageRatio;
    label: string;
    ratio: number;
}[] = [
    { value: 'portrait', label: 'Portrait (4:5)', ratio: 4 / 5 },
    { value: 'square', label: 'Square (1:1)', ratio: 1 },
    { value: 'landscape', label: 'Landscape (16:9)', ratio: 16 / 9 },
];

export function imageRatioOf(
    field: Pick<RegistrationField, 'image_ratio'>,
): number {
    return (
        IMAGE_RATIOS.find((r) => r.value === (field.image_ratio ?? 'portrait'))
            ?.ratio ?? 4 / 5
    );
}

/**
 * A `file` field with this key on a team category is the team's logo — the
 * server copies it onto the team. Mirrors RegistrationCategory::TEAM_LOGO_KEY.
 */
export const TEAM_LOGO_KEY = 'team_logo';

/** Mirrors RegistrationCategory::ROSTER_MEMBER_FIELD_TYPES. */
export type RosterMemberFieldType =
    'text' | 'number' | 'date' | 'select' | 'phone';

/** An organiser-defined question asked of every roster member; answers land in players.extra. */
export interface RosterMemberField {
    key: string;
    label: string;
    type: RosterMemberFieldType;
    required: boolean;
    options?: string[];
}

export interface RegistrationField {
    key: string;
    label: string;
    type: RegistrationFieldType;
    required: boolean;
    options?: string[];
    /** For `description` blocks this is the body text shown under the heading. */
    help_text?: string | null;
    /** number type only */
    min?: number | null;
    max?: number | null;
    /** rating type only — defaults to 5 when unset */
    max_rating?: number | null;
    /** file type only — crop/aspect preset; defaults to portrait */
    image_ratio?: ImageRatio | null;
    /** Overrides the generic "required" validation message for this field. */
    error_message?: string | null;
    /** roster type only: the roles a team enters and how many of each */
    slots?: RosterSlot[];
    /** roster type only: extra questions per member */
    member_fields?: RosterMemberField[];
    /**
     * roster type only: ask for every member's photo, documents and birth
     * details on the form (default true). When false the form takes only
     * name, role and jersey; the rest is completed in the roster portal.
     */
    details_on_form?: boolean;
}

/** Mirrors RegistrationCategory::rosterDetailsOnForm(). */
export function rosterDetailsOnForm(
    field: Pick<RegistrationField, 'details_on_form'>,
): boolean {
    return field.details_on_form ?? true;
}

/** What the public form submits per roster member; mirrors RosterService::memberRules(). */
export interface RosterMemberInput {
    role: PlayerRole;
    name: string;
    jersey_number: string;
    position: string;
    photo: string;
    identity_card: string;
    birthplace: string;
    dob: string;
    phone_number: string;
    email: string;
    certificate: string;
    extra: Record<string, string>;
}

export function emptyRosterMember(
    role: PlayerRole,
    memberFields: RosterMemberField[] = [],
): RosterMemberInput {
    return {
        role,
        name: '',
        jersey_number: '',
        position: '',
        photo: '',
        identity_card: '',
        birthplace: '',
        dob: '',
        phone_number: '',
        email: '',
        certificate: '',
        extra: Object.fromEntries(memberFields.map((f) => [f.key, ''])),
    };
}

export const ROSTER_MEMBER_FIELD_TYPES: {
    value: RosterMemberFieldType;
    label: string;
}[] = [
    { value: 'text', label: 'Text' },
    { value: 'number', label: 'Number' },
    { value: 'date', label: 'Date' },
    { value: 'select', label: 'Dropdown' },
    { value: 'phone', label: 'Phone' },
];

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

export type TournamentFormat = 'round_robin' | 'pool_stage';

/**
 * The basketball side of a team category — what turns a list of registered
 * teams into pools, a bracket and standings. Mirrors the writable columns of
 * BasketballEventCategory; price/quota/open state stay on the category.
 */
export interface TournamentSettings {
    format: TournamentFormat;
    win_points: number;
    loss_points: number;
    min_team: number;
    min_player_per_team: number;
    max_player_per_team: number | null;
    max_player_per_coach: number | null;
    /** Roster edits close here; null means "when registration closes". */
    roster_closes_at: string | null;
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
    /** Present (when loaded) for team categories that run a basketball tournament. */
    basketball_category?: (TournamentSettings & { id: number }) | null;
}

export const TOURNAMENT_FORMATS: {
    value: TournamentFormat;
    label: string;
    description: string;
}[] = [
    {
        value: 'pool_stage',
        label: 'Pool Stage → Knockout',
        description:
            'Teams are divided into pools before entering an elimination bracket.',
    },
    {
        value: 'round_robin',
        label: 'Round Robin',
        description: 'Every team plays every other team. No pools are created.',
    },
];

export const DEFAULT_TOURNAMENT_SETTINGS: TournamentSettings = {
    format: 'pool_stage',
    win_points: 2,
    loss_points: 1,
    min_team: 2,
    min_player_per_team: 5,
    max_player_per_team: null,
    max_player_per_coach: null,
    roster_closes_at: null,
};

/**
 * A category as the public event page sees it — still listed (with its price)
 * when registration is closed or full, but flagged so the card renders as a
 * disabled row instead of a link into a form that would only reject you.
 */
export interface PublicRegistrationCategory extends RegistrationCategory {
    is_available: boolean;
    unavailable_reason: 'closed' | 'full' | 'ended' | null;
    slots_left: number | null;
}

export const REGISTRATION_FIELD_TYPES: {
    value: RegistrationFieldType;
    label: string;
}[] = [
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
    { value: 'description', label: 'Description' },
    { value: 'roster', label: 'Team roster' },
];

/** Field types where `options` (comma-separated choices) apply. */
export const OPTION_FIELD_TYPES: RegistrationFieldType[] = ['select', 'radio'];

/**
 * Field types that only display text on the form and never collect a value —
 * skipped by validation, submission, exports and any "pick a field" list.
 * Mirrors RegistrationCategory::DISPLAY_ONLY_TYPES.
 */
export const DISPLAY_ONLY_FIELD_TYPES: RegistrationFieldType[] = [
    'description',
];

/**
 * True for fields whose answer is a single form_data value. The roster block
 * collects people, not an answer — its members become the team sheet — so it
 * is neither an input field nor display-only; callers handle it explicitly.
 */
export function isInputField(field: Pick<RegistrationField, 'type'>): boolean {
    return (
        !DISPLAY_ONLY_FIELD_TYPES.includes(field.type) &&
        field.type !== 'roster'
    );
}

export function isRosterField(field: Pick<RegistrationField, 'type'>): boolean {
    return field.type === 'roster';
}

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
        branding: {
            primary_color: '#f97316',
            secondary_color: '#c2410c',
            background_color: '#ffffff',
            text_color: '#171717',
            border_radius: 'rounded',
        },
    },
    {
        name: 'Ocean',
        branding: {
            primary_color: '#0ea5e9',
            secondary_color: '#0369a1',
            background_color: '#ffffff',
            text_color: '#0c1a24',
            border_radius: 'rounded',
        },
    },
    {
        name: 'Forest',
        branding: {
            primary_color: '#16a34a',
            secondary_color: '#166534',
            background_color: '#ffffff',
            text_color: '#14201a',
            border_radius: 'sharp',
        },
    },
    {
        name: 'Berry',
        branding: {
            primary_color: '#db2777',
            secondary_color: '#9d174d',
            background_color: '#ffffff',
            text_color: '#22131a',
            border_radius: 'pill',
            font_family: "'Poppins', sans-serif",
        },
    },
    {
        name: 'Slate',
        branding: {
            primary_color: '#475569',
            secondary_color: '#1e293b',
            background_color: '#f8fafc',
            text_color: '#0f172a',
            border_radius: 'sharp',
            font_family: "'Georgia', serif",
        },
    },
];
