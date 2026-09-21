import axios from 'axios';
import { Clock, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { UploadImage } from '@/components/upload-image';
import { useT } from '@/hooks/use-t';
import { formatRupiah } from '@/lib/format-currency';
import { proof } from '@/routes/registrations';
import type { Payment } from '@/types/payment';

interface Props {
    qrToken: string;
    amount: string | null;
    instructions?: string | null;
    /** The registration's latest payment, if one exists yet. */
    payment?: Payment | null;
    /** Called after proof is submitted, so the caller can refresh/redirect. */
    onSubmitted?: () => void;
}

/**
 * The manual-transfer counterpart of the Midtrans "Pay Now" button: shows
 * the amount and the organizer's instructions, collects a transfer
 * screenshot, and — once one has been submitted — a waiting message instead
 * of the upload widget, since verification happens on the organizer's side.
 */
export function ManualPaymentPanel({
    qrToken,
    amount,
    instructions,
    payment,
    onSubmitted,
}: Props) {
    const { t } = useT();
    const [proofUrl, setProofUrl] = useState<string>(payment?.proof_path ?? '');
    const [accountName, setAccountName] = useState(payment?.payer_account_name ?? '');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    if (payment?.proof_path) {
        return (
            <div className="flex flex-col items-center gap-3 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 text-amber-600">
                    <Clock className="h-8 w-8" />
                </div>
                <p className="font-semibold">{t('Awaiting verification')}</p>
                <p className="text-sm text-neutral-600">
                    {t(
                        'We received your payment proof — an organizer will confirm your registration shortly.',
                    )}
                </p>
            </div>
        );
    }

    const submit = () => {
        if (!proofUrl || !accountName.trim()) {
            return;
        }

        setIsSubmitting(true);
        setError(null);

        axios
            .post(proof.url(qrToken), {
                proof_path: proofUrl,
                payer_account_name: accountName.trim(),
            })
            .then(() => onSubmitted?.())
            .catch(() => setError(t('Couldn’t submit — please try again.')))
            .finally(() => setIsSubmitting(false));
    };

    return (
        <div className="flex w-full flex-col items-center gap-4">
            <p className="text-3xl font-bold text-neutral-900">
                {formatRupiah(amount)}
            </p>

            {instructions && (
                <p className="w-full rounded-lg bg-neutral-100 p-3 text-left text-sm whitespace-pre-line text-neutral-700">
                    {instructions}
                </p>
            )}

            <div className="w-full space-y-2 text-left">
                <Label htmlFor="payer-account-name">
                    Nama Rekening yang Melakukan Pembayaran
                </Label>
                <Input
                    id="payer-account-name"
                    name="payer_account_name"
                    value={accountName}
                    onChange={(event) => setAccountName(event.target.value)}
                    maxLength={255}
                    required
                    disabled={isSubmitting}
                />
            </div>

            <div className="w-full max-w-48">
                <UploadImage
                    value={proofUrl}
                    ratio={1}
                    uploadUrl="/public-upload/image"
                    deleteUrl="/public-upload/image"
                    placeholder={t('Upload your transfer receipt')}
                    onChange={(value) => setProofUrl(value ?? '')}
                    onError={(message) => setError(message)}
                />
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <Button
                type="button"
                onClick={submit}
                disabled={!proofUrl || !accountName.trim() || isSubmitting}
                className="w-full cursor-pointer bg-[var(--accent)] font-bold tracking-wide text-white uppercase hover:bg-[var(--accent-dark)]"
            >
                {isSubmitting ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                {isSubmitting
                    ? t('Submitting…')
                    : t('Submit payment proof')}
            </Button>
        </div>
    );
}
