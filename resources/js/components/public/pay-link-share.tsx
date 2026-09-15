import { Check, Copy, MessageCircle } from 'lucide-react';
import { useSyncExternalStore } from 'react';
import { Button } from '@/components/ui/button';
import { useClipboard } from '@/hooks/use-clipboard';
import { useT } from '@/hooks/use-t';
import { formatDateTime } from '@/lib/format-date';

/**
 * The person filling the form is often not the person paying — a club
 * manager registers, the treasurer pays. This hands them the status page's
 * URL (which carries "Pay Now") to forward, and says how long the slot is
 * held, so nobody finds out it lapsed by reading an "expired" page later.
 */
export function PayLinkShare({
    qrToken,
    expiresAt,
    message,
}: {
    qrToken: string;
    expiresAt: string | null;
    /** The WhatsApp text, without the link — it is appended. */
    message: string;
}) {
    const { t } = useT();
    const [copied, copy] = useClipboard();
    // window is not there on the server pass, so the origin is '' until hydration.
    const origin = useSyncExternalStore(
        () => () => {},
        () => window.location.origin,
        () => '',
    );
    const url = origin ? `${origin}/registrations/${qrToken}/status` : '';

    const whatsapp = url
        ? `https://wa.me/?text=${encodeURIComponent(`${message}\n${url}`)}`
        : undefined;

    return (
        <div className="flex w-full flex-col gap-3 text-left">
            {expiresAt && (
                <p
                    className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800"
                    suppressHydrationWarning
                >
                    {t('Pay before :time — after that the slot is released.', {
                        time: formatDateTime(expiresAt),
                    })}
                </p>
            )}

            <div className="rounded-xl border border-dashed border-neutral-300 p-3">
                <p className="text-xs font-semibold text-neutral-900">
                    {t('Someone else paying?')}
                </p>
                <p className="mt-0.5 text-xs text-neutral-500">
                    {t(
                        'Send them this link — it opens the payment for this registration.',
                    )}
                </p>
                <div className="mt-2 flex gap-2">
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="flex-1 cursor-pointer"
                        disabled={!url}
                        onClick={() => void copy(url)}
                    >
                        {copied ? (
                            <Check className="mr-1.5 h-3.5 w-3.5" />
                        ) : (
                            <Copy className="mr-1.5 h-3.5 w-3.5" />
                        )}
                        {copied ? t('Copied') : t('Copy link')}
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        asChild
                    >
                        <a
                            href={whatsapp}
                            target="_blank"
                            rel="noreferrer"
                            aria-disabled={!whatsapp}
                        >
                            <MessageCircle className="mr-1.5 h-3.5 w-3.5" />
                            WhatsApp
                        </a>
                    </Button>
                </div>
            </div>
        </div>
    );
}
