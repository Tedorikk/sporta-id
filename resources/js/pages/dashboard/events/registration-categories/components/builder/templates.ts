import type {
    FormPage,
    RegistrationSubjectType,
} from '@/types/registration-category';

export interface FormTemplate {
    key: string;
    name: string;
    description: string;
    pages: Omit<FormPage, 'key'>[];
    /** Sets "Who registers" when the template implies one — a race entry is always individual, a team entry always team. */
    subjectType?: RegistrationSubjectType;
}

/**
 * What a race entry collects on top of the built-in name: contact details,
 * date of birth and gender (what the bib sequence and age check read),
 * jersey size, the face photo and identity card a race pack hands out
 * against, and the rules acknowledgement. Mirrors
 * RunningEventCategory::defaultFormPages().
 */
export const RACE_ENTRY_TEMPLATE: FormTemplate = {
    key: 'race_entry',
    name: 'Race entry',
    description:
        'Contact details, date of birth, gender and jersey size, plus a face photo and ID for race-pack collection.',
    subjectType: 'individual',
    pages: [
        {
            title: 'Data Pelari',
            fields: [
                {
                    key: 'email',
                    label: 'Email',
                    type: 'email',
                    required: true,
                },
                {
                    key: 'phone',
                    label: 'No. WhatsApp',
                    type: 'phone',
                    required: true,
                },
                {
                    key: 'dob',
                    label: 'Tanggal Lahir',
                    type: 'date',
                    required: true,
                },
                {
                    key: 'gender',
                    label: 'Jenis Kelamin',
                    type: 'gender',
                    required: true,
                },
                {
                    key: 'nationality',
                    label: 'Kewarganegaraan',
                    type: 'select',
                    required: true,
                    options: ['WNI', 'WNA'],
                },
                {
                    key: 'jersey_size',
                    label: 'Ukuran Jersey',
                    type: 'select',
                    required: true,
                    options: ['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL'],
                },
                {
                    key: 'emergency_contact',
                    label: 'Kontak Darurat',
                    type: 'phone',
                    required: false,
                },
            ],
        },
        {
            title: 'Foto & Identitas',
            fields: [
                {
                    key: 'photo',
                    label: 'Foto Wajah',
                    type: 'file',
                    required: true,
                    image_ratio: 'portrait',
                },
                {
                    key: 'identity_card',
                    label: 'Kartu Identitas (KTP/Paspor)',
                    type: 'file',
                    required: true,
                    image_ratio: 'landscape',
                },
                {
                    key: 'agree_rules',
                    label: 'Persetujuan',
                    type: 'checkbox',
                    required: true,
                    help_text:
                        'Saya telah membaca dan menyetujui peraturan lomba.',
                },
            ],
        },
    ],
};

/**
 * What a basketball team entry collects on top of the built-in team name:
 * bank-transfer evidence for organisers who settle fees outside Midtrans.
 * Mirrors BasketballEventCategory::defaultFormPages().
 */
export const BASKETBALL_TEAM_TEMPLATE: FormTemplate = {
    key: 'basketball_team',
    name: 'Basketball team entry',
    description:
        'Team origin, officials and players (the roster), payment proof, and the paperwork.',
    pages: [
        {
            title: 'Data Tim',
            fields: [
                {
                    key: 'asal_kabupaten_kota',
                    label: 'Asal Kabupaten/Kota',
                    type: 'text',
                    required: true,
                },
                {
                    key: 'team_logo',
                    label: 'Logo Tim',
                    type: 'file',
                    required: true,
                    image_ratio: 'square',
                    help_text:
                        'Gunakan gambar dengan latar belakang transparan.\nGambar tidak dapat diganti di kemudian hari.\nCrop gambar sesuai dengan grid.',
                },
            ],
        },
        {
            title: 'Data Official & Peserta',
            fields: [
                {
                    key: 'roster',
                    label: 'Official & Pemain',
                    type: 'roster',
                    required: true,
                    details_on_form: false,
                    help_text: 'Daftarkan official dan pemain tim Anda.',
                    slots: [
                        { role: 'manager', label: 'Manager', min: 1, max: 1 },
                        { role: 'coach', label: 'Coach', min: 1, max: 1 },
                        {
                            role: 'assistant_coach',
                            label: 'Ass. Coach',
                            min: 1,
                            max: 1,
                        },
                        { role: 'player', label: 'Pemain', min: 7, max: 12 },
                    ],
                    member_fields: [
                        {
                            key: 'asal_sekolah',
                            label: 'Asal Sekolah',
                            type: 'text',
                            required: true,
                        },
                        {
                            key: 'kelas',
                            label: 'Kelas',
                            type: 'text',
                            required: true,
                        },
                    ],
                },
            ],
        },
        {
            title: 'Pembayaran',
            fields: [
                {
                    key: 'bukti_pembayaran',
                    label: 'Bukti Pembayaran',
                    type: 'document',
                    required: true,
                    help_text: 'Unggah bukti transfer biaya pendaftaran tim.',
                },
                {
                    key: 'nama_rekening_pembayaran',
                    label: 'Nama Rekening yang Melakukan Pembayaran',
                    type: 'text',
                    required: true,
                },
            ],
        },
        {
            title: 'Dokumen',
            fields: [
                {
                    key: 'surat_pernyataan',
                    label: 'Surat Pernyataan',
                    type: 'document',
                    required: true,
                },
                {
                    key: 'lisensi_tim_medis',
                    label: 'Lisensi/Sertifikat Tim Medis',
                    type: 'document',
                    required: false,
                },
            ],
        },
    ],
};

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
                    {
                        key: 'shirt_size',
                        label: 'Shirt Size',
                        type: 'select',
                        required: true,
                        options: ['S', 'M', 'L', 'XL'],
                    },
                    {
                        key: 'dietary_needs',
                        label: 'Dietary Restrictions',
                        type: 'text',
                        required: false,
                    },
                    {
                        key: 'emergency_contact',
                        label: 'Emergency Contact Number',
                        type: 'phone',
                        required: true,
                    },
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
                fields: [
                    {
                        key: 'role',
                        label: 'What best describes you?',
                        type: 'radio',
                        required: true,
                        options: ['Participant', 'Volunteer', 'Spectator'],
                    },
                ],
            },
            {
                title: 'Your feedback',
                fields: [
                    {
                        key: 'satisfaction',
                        label: 'How satisfied are you overall?',
                        type: 'rating',
                        required: true,
                        max_rating: 5,
                    },
                    {
                        key: 'comments',
                        label: 'Anything else you would like to share?',
                        type: 'textarea',
                        required: false,
                    },
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
                    {
                        key: 'rating',
                        label: 'Rate your experience',
                        type: 'rating',
                        required: true,
                        max_rating: 5,
                    },
                    {
                        key: 'feedback',
                        label: 'Tell us more',
                        type: 'textarea',
                        required: false,
                    },
                ],
            },
        ],
    },
    {
        key: 'application',
        name: 'Application',
        description:
            'Multi-step application with a document upload and signature.',
        pages: [
            {
                title: 'Applicant Info',
                fields: [
                    {
                        key: 'motivation',
                        label: 'Why do you want to join?',
                        type: 'textarea',
                        required: true,
                    },
                ],
            },
            {
                title: 'Documents',
                fields: [
                    {
                        key: 'id_proof',
                        label: 'ID Document',
                        type: 'document',
                        required: true,
                    },
                ],
            },
            {
                title: 'Confirmation',
                fields: [
                    {
                        key: 'signature',
                        label: 'Signature',
                        type: 'signature',
                        required: true,
                    },
                ],
            },
        ],
    },
];
