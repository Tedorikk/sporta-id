export type CardElementKind = 'text' | 'image' | 'qr' | 'shape';

export type CardSubjectType = 'player' | 'team' | 'attendee';

export interface CardElementStyle {
    fontSize?: number;
    fontWeight?: number;
    textAlign?: 'left' | 'center' | 'right';
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
    name: string;
    canvas: CardCanvas;
    elements: CardElement[];
    is_default?: boolean;
}

/** Fields available to bind an element to, per subject type — drives the builder's binding dropdown. */
export const BINDABLE_FIELDS: Record<CardSubjectType, { value: string; label: string }[]> = {
    attendee: [
        { value: 'name', label: 'Name' },
        { value: 'photo', label: 'Photo' },
        { value: 'typeLabel', label: 'Type (e.g. Guest, Tenant)' },
        { value: 'organization', label: 'Organization / Company' },
        { value: 'title', label: 'Title (booth #, credential, etc.)' },
        { value: 'status', label: 'Status' },
        { value: 'qrDataUrl', label: 'QR Code' },
        { value: 'eventName', label: 'Event Name' },
        { value: 'eventLogo', label: 'Event Logo' },
    ],
    player: [
        { value: 'name', label: 'Name' },
        { value: 'photo', label: 'Photo' },
        { value: 'typeLabel', label: 'Role' },
        { value: 'jerseyNumber', label: 'Jersey Number' },
        { value: 'teamName', label: 'Team Name' },
        { value: 'qrDataUrl', label: 'QR Code' },
        { value: 'eventName', label: 'Event Name' },
        { value: 'eventLogo', label: 'Event Logo' },
    ],
    team: [
        { value: 'name', label: 'Team Name' },
        { value: 'photo', label: 'Logo' },
        { value: 'qrDataUrl', label: 'QR Code' },
        { value: 'eventName', label: 'Event Name' },
        { value: 'eventLogo', label: 'Event Logo' },
    ],
};
