import { toPng } from 'html-to-image';
import { Download, Printer, Share2 } from 'lucide-react';
import { useState } from 'react';
import type { RefObject } from 'react';
import { toast } from 'sonner';

interface IdCardActionsProps {
    targetRef: RefObject<HTMLElement | null>;
    fileName: string;
    shareTitle: string;
    shareUrl: string;
}

export function IdCardActions({
    targetRef,
    fileName,
    shareTitle,
    shareUrl,
}: IdCardActionsProps) {
    const [isDownloading, setIsDownloading] = useState(false);

    const handleShare = async () => {
        if (navigator.share) {
            try {
                await navigator.share({ title: shareTitle, url: shareUrl });
            } catch {
                // User cancelled the share sheet — not an error.
            }

            return;
        }

        try {
            await navigator.clipboard.writeText(shareUrl);
            toast.success('Link copied to clipboard');
        } catch {
            toast.error('Could not copy the link');
        }
    };

    const handleDownload = async () => {
        const node = targetRef.current;

        if (!node) {
            return;
        }

        setIsDownloading(true);

        try {
            const dataUrl = await toPng(node, {
                cacheBust: true,
                pixelRatio: 2,
                skipFonts: true,
            });

            const link = document.createElement('a');
            link.download = `${fileName}.png`;
            link.href = dataUrl;
            link.click();
        } catch {
            toast.error('Could not generate image. Try Print instead.');
        } finally {
            setIsDownloading(false);
        }
    };

    return (
        <div className="fixed right-6 bottom-6 z-50 flex items-center gap-2 print:hidden">
            <button
                onClick={handleShare}
                aria-label="Share"
                className="flex h-11 w-11 items-center justify-center rounded-full border-2 border-black bg-white text-black shadow-lg transition hover:bg-neutral-100 active:scale-95"
            >
                <Share2 className="h-4 w-4" />
            </button>
            <button
                onClick={handleDownload}
                disabled={isDownloading}
                aria-label="Download as image"
                className="flex h-11 w-11 items-center justify-center rounded-full border-2 border-black bg-white text-black shadow-lg transition hover:bg-neutral-100 active:scale-95 disabled:opacity-60"
            >
                <Download className="h-4 w-4" />
            </button>
            <button
                onClick={() => window.print()}
                aria-label="Print"
                className="flex items-center gap-2 rounded-full bg-red-600 px-5 py-2.5 text-sm font-bold text-white shadow-lg transition hover:bg-red-700 active:scale-95"
            >
                <Printer className="h-4 w-4" />
                Print
            </button>
        </div>
    );
}
