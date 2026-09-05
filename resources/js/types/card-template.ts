export type CardElementKind = 'text' | 'image' | 'qr' | 'shape';

export type CardSubjectType = 'player' | 'team' | 'attendee' | 'registration';

export interface CardElementStyle {
    fontSize?: number;
    fontWeight?: number;
    fontFamily?: string;
    fontStyle?: 'normal' | 'italic';
    letterSpacing?: number;
    lineHeight?: number;
    textTransform?: 'none' | 'uppercase' | 'capitalize';
    textAlign?: 'left' | 'center' | 'right';
    verticalAlign?: 'top' | 'middle' | 'bottom';
    color?: string;
    background?: string;
    borderRadius?: number;
    borderColor?: string;
    borderWidth?: number;
    objectFit?: 'cover' | 'contain';
    opacity?: number;
}

export interface CardElement {
    id: string;
    kind: CardElementKind;
    /** Human label shown in the layers panel. Falls back to kind/binding when absent. */
    name?: string;
    /** Data field this element pulls its value from, e.g. "name", "photo", "qrDataUrl". Null for static content. */
    binding: string | null;
    x: number;
    y: number;
    width: number;
    height: number;
    rotation: number;
    zIndex: number;
    style: CardElementStyle;
    staticText?: string;
    staticImageUrl?: string;
    /** Editor-only flags, persisted so they survive a reload. */
    locked?: boolean;
    hidden?: boolean;
}

export interface CardCanvas {
    width: number;
    height: number;
    background: string;
}

export interface CardTemplate {
    id: number | null;
    event_id?: number;
    subject_type: CardSubjectType;
    attendee_type_id: number | null;
    registration_category_id: number | null;
    name: string;
    canvas: CardCanvas;
    elements: CardElement[];
    is_default?: boolean;
}

export interface BindableField {
    value: string;
    label: string;
    /** Which element kinds can render this field. Drives the binding dropdown filter. */
    kinds: CardElementKind[];
}

/** Fields available to bind an element to, per subject type — drives the builder's binding dropdown. */
export const BINDABLE_FIELDS: Record<CardSubjectType, BindableField[]> = {
    attendee: [
        { value: 'name', label: 'Name', kinds: ['text'] },
        {
            value: 'typeLabel',
            label: 'Type (e.g. Guest, Tenant)',
            kinds: ['text'],
        },
        {
            value: 'organization',
            label: 'Organization / Company',
            kinds: ['text'],
        },
        {
            value: 'title',
            label: 'Title (booth #, credential, etc.)',
            kinds: ['text'],
        },
        { value: 'status', label: 'Status', kinds: ['text'] },
        {
            value: 'verificationCode',
            label: 'Verification Code',
            kinds: ['text'],
        },
        { value: 'eventName', label: 'Event Name', kinds: ['text'] },
        { value: 'photo', label: 'Photo', kinds: ['image'] },
        { value: 'eventLogo', label: 'Event Logo', kinds: ['image'] },
        { value: 'appLogo', label: 'App Logo', kinds: ['image'] },
        { value: 'qrDataUrl', label: 'QR Code', kinds: ['qr', 'image'] },
    ],
    player: [
        { value: 'name', label: 'Name', kinds: ['text'] },
        { value: 'typeLabel', label: 'Role', kinds: ['text'] },
        { value: 'jerseyNumber', label: 'Jersey Number', kinds: ['text'] },
        { value: 'teamName', label: 'Team Name', kinds: ['text'] },
        { value: 'categoryName', label: 'Category', kinds: ['text'] },
        { value: 'eventName', label: 'Event Name', kinds: ['text'] },
        { value: 'photo', label: 'Photo', kinds: ['image'] },
        { value: 'eventLogo', label: 'Event Logo', kinds: ['image'] },
        { value: 'appLogo', label: 'App Logo', kinds: ['image'] },
        { value: 'qrDataUrl', label: 'QR Code', kinds: ['qr', 'image'] },
    ],
    team: [
        { value: 'name', label: 'Team Name', kinds: ['text'] },
        { value: 'categoryName', label: 'Category', kinds: ['text'] },
        { value: 'eventName', label: 'Event Name', kinds: ['text'] },
        { value: 'photo', label: 'Logo', kinds: ['image'] },
        { value: 'eventLogo', label: 'Event Logo', kinds: ['image'] },
        { value: 'appLogo', label: 'App Logo', kinds: ['image'] },
        { value: 'qrDataUrl', label: 'QR Code', kinds: ['qr', 'image'] },
    ],
    registration: [
        { value: 'name', label: 'Name', kinds: ['text'] },
        { value: 'typeLabel', label: 'Category', kinds: ['text'] },
        { value: 'email', label: 'Email', kinds: ['text'] },
        { value: 'phone', label: 'Phone', kinds: ['text'] },
        {
            value: 'verificationCode',
            label: 'Verification Code',
            kinds: ['text'],
        },
        { value: 'eventName', label: 'Event Name', kinds: ['text'] },
        { value: 'photo', label: 'Photo', kinds: ['image'] },
        { value: 'eventLogo', label: 'Event Logo', kinds: ['image'] },
        { value: 'appLogo', label: 'App Logo', kinds: ['image'] },
        { value: 'qrDataUrl', label: 'QR Code', kinds: ['qr', 'image'] },
    ],
};

export function bindableFieldsFor(
    subjectType: CardSubjectType,
    kind: CardElementKind,
    extra: BindableField[] = [],
): BindableField[] {
    return [...BINDABLE_FIELDS[subjectType], ...extra].filter((field) =>
        field.kinds.includes(kind),
    );
}

export function bindingLabel(
    subjectType: CardSubjectType,
    binding: string,
    extra: BindableField[] = [],
): string {
    return (
        [...BINDABLE_FIELDS[subjectType], ...extra].find(
            (field) => field.value === binding,
        )?.label ?? binding
    );
}
