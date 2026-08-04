import { X, ZoomIn } from 'lucide-react';
import { useEffect } from 'react';
import { cn } from '@/lib/utils';

export type Lightbox = { src: string; alt: string };

export function ImageLightbox({ image, onClose }: { image: Lightbox; onClose: () => void }) {
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose();
            }
        };

        window.addEventListener('keydown', handleKeyDown);

        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    return (
        <div className="fixed inset-0 z-50 flex animate-in items-center justify-center bg-black/85 p-4 duration-150 fade-in" onClick={onClose}>
            <button
                type="button"
                onClick={onClose}
                className="absolute top-4 right-4 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
                aria-label="Close"
            >
                <X className="h-5 w-5" />
            </button>
            <img
                src={image.src}
                alt={image.alt}
                onClick={(e) => e.stopPropagation()}
                className="max-h-[88vh] max-w-[92vw] rounded-xl object-contain shadow-2xl"
            />
            <p className="absolute bottom-6 left-1/2 -translate-x-1/2 text-sm font-medium text-white/80">{image.alt}</p>
        </div>
    );
}

export function ZoomableImage({
    src,
    alt,
    onOpen,
    className,
    fallback,
}: {
    src: string | null | undefined;
    alt: string;
    onOpen: (image: Lightbox) => void;
    className: string;
    fallback: React.ReactNode;
}) {
    if (!src) {
        return <div className={className}>{fallback}</div>;
    }

    return (
        <button
            type="button"
            onClick={() => onOpen({ src, alt })}
            className={cn(className, 'group relative cursor-zoom-in overflow-hidden p-0')}
        >
            <img src={src} alt={alt} className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105" />
            <span className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition-all duration-150 group-hover:bg-black/40 group-hover:opacity-100">
                <ZoomIn className="h-6 w-6 text-white" />
            </span>
        </button>
    );
}
