export type PaymentStatus =
    | 'pending'
    | 'settlement'
    | 'expire'
    | 'cancel'
    | 'deny'
    | 'failure'
    | 'refund';

export interface Payment {
    id: number;
    registration_id: number;
    order_id: string;
    amount: string;
    status: PaymentStatus;
    midtrans_transaction_id: string | null;
    payment_type: string | null;
    snap_token: string | null;
    paid_at: string | null;
    /** Set once a registrant uploads a manual-transfer screenshot; null for a Midtrans payment. */
    proof_path: string | null;
    verified_at: string | null;
}
