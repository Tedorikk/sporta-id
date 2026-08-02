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
    | 'file';

export interface RegistrationField {
    key: string;
    label: string;
    type: RegistrationFieldType;
    required: boolean;
    options?: string[];
    help_text?: string | null;
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
    form_schema: RegistrationField[] | null;
    status: string;
    registrations_count?: number;
}

export const REGISTRATION_FIELD_TYPES: { value: RegistrationFieldType; label: string }[] = [
    { value: 'text', label: 'Text' },
    { value: 'number', label: 'Number' },
    { value: 'email', label: 'Email' },
    { value: 'phone', label: 'Phone' },
    { value: 'date', label: 'Date' },
    { value: 'select', label: 'Dropdown' },
    { value: 'radio', label: 'Radio buttons' },
    { value: 'checkbox', label: 'Checkbox' },
    { value: 'textarea', label: 'Long text' },
    { value: 'file', label: 'Photo / file upload' },
];
