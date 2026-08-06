import type { FormPage } from '@/types/registration-category';

export interface FormTemplate {
    key: string;
    name: string;
    description: string;
    pages: Omit<FormPage, 'key'>[];
}

/**
 * Static starter presets — picking one just seeds `form_pages` client-side,
 * there's nothing to persist server-side until the organizer saves.
 */
export const FORM_TEMPLATES: FormTemplate[] = [
    {
        key: 'blank',
        name: 'Blank form',
        description: 'Start from scratch with a single empty page.',
        pages: [{ title: 'Details', fields: [] }],
    },
    {
        key: 'registration',
        name: 'Event registration',
        description: 'Shirt size, dietary needs, and an emergency contact.',
        pages: [
            {
                title: 'Details',
                fields: [
                    { key: 'shirt_size', label: 'Shirt Size', type: 'select', required: true, options: ['S', 'M', 'L', 'XL'] },
                    { key: 'dietary_needs', label: 'Dietary Restrictions', type: 'text', required: false },
                    { key: 'emergency_contact', label: 'Emergency Contact Number', type: 'phone', required: true },
                ],
            },
        ],
    },
    {
        key: 'survey',
        name: 'Survey',
        description: 'Rating plus open-ended feedback, in two short steps.',
        pages: [
            {
                title: 'About you',
                fields: [{ key: 'role', label: 'What best describes you?', type: 'radio', required: true, options: ['Participant', 'Volunteer', 'Spectator'] }],
            },
            {
                title: 'Your feedback',
                fields: [
                    { key: 'satisfaction', label: 'How satisfied are you overall?', type: 'rating', required: true, max_rating: 5 },
                    { key: 'comments', label: 'Anything else you would like to share?', type: 'textarea', required: false },
                ],
            },
        ],
    },
    {
        key: 'feedback',
        name: 'Feedback form',
        description: 'A quick single-page rating and comment box.',
        pages: [
            {
                title: 'Feedback',
                fields: [
                    { key: 'rating', label: 'Rate your experience', type: 'rating', required: true, max_rating: 5 },
                    { key: 'feedback', label: 'Tell us more', type: 'textarea', required: false },
                ],
            },
        ],
    },
    {
        key: 'application',
        name: 'Application',
        description: 'Multi-step application with a document upload and signature.',
        pages: [
            {
                title: 'Applicant Info',
                fields: [{ key: 'motivation', label: 'Why do you want to join?', type: 'textarea', required: true }],
            },
            {
                title: 'Documents',
                fields: [{ key: 'id_proof', label: 'ID Document', type: 'document', required: true }],
            },
            {
                title: 'Confirmation',
                fields: [{ key: 'signature', label: 'Signature', type: 'signature', required: true }],
            },
        ],
    },
];
