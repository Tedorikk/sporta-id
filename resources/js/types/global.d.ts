import type { Locale } from '@/lib/i18n';
import type { Auth } from '@/types/auth';

declare module 'react' {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    interface InputHTMLAttributes<T> {
        passwordrules?: string;
    }
}

declare module '@inertiajs/core' {
    export interface InertiaConfig {
        sharedPageProps: {
            name: string;
            locale: Locale;
            auth: Auth;
            sidebarOpen: boolean;
            [key: string]: unknown;
        };
    }
}

declare global {
    /** Midtrans Snap.js, loaded on-demand — see resources/js/lib/midtrans.ts */
    interface MidtransSnapResult {
        order_id: string;
        transaction_status: string;
        [key: string]: unknown;
    }

    interface Window {
        snap?: {
            pay: (
                snapToken: string,
                callbacks?: {
                    onSuccess?: (result: MidtransSnapResult) => void;
                    onPending?: (result: MidtransSnapResult) => void;
                    onError?: (result: MidtransSnapResult) => void;
                    onClose?: () => void;
                },
            ) => void;
        };
    }
}
