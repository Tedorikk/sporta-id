import { ImageOff } from 'lucide-react';
import { formatImageUrl } from '@/lib/image-utils';
import { cn } from '@/lib/utils';

interface Props {
    banner?: string | null;
    /** Decorative by default: the event name is already beside the image. */
    alt?: string;
    className?: string;
    imageClassName?: string;
    /** Hidden on small thumbnails, where there is no room for a caption. */
    showLabel?: boolean;
}

/**
 * An event's banner, or a placeholder for the events that have none.
 *
 * Previously an unset banner rendered `<img src={undefined}>`, which browsers
 * show as a broken-image icon.
 */
export function EventBanner({
    banner,
    alt = '',
    className,
    imageClassName,
    showLabel = true,
}: Props) {
    if (banner) {
        return (
            <img
                src={formatImageUrl(banner)}
                alt={alt}
                className={cn(
                    'h-full w-full object-cover',
                    className,
                    imageClassName,
                )}
            />
        );
    }

    return (
        <div
            role="img"
            aria-label="No banner uploaded"
            className={cn(
                'relative flex h-full w-full items-center justify-center overflow-hidden bg-muted',
                className,
            )}
        >
            {/* Breathing glow behind the icon. */}
            <span
                aria-hidden="true"
                className="absolute size-40 rounded-full bg-primary/25 blur-3xl motion-safe:animate-banner-glow"
            />

            {/* Drifting motes, offset so they do not move in lockstep. */}
            <span
                aria-hidden="true"
                className="absolute top-[22%] left-[24%] size-2 rounded-full bg-primary/40 motion-safe:animate-banner-drift"
            />
            <span
                aria-hidden="true"
                className="absolute top-[68%] left-[70%] size-3 rounded-full bg-primary/30 [animation-delay:-2.5s] motion-safe:animate-banner-drift"
            />
            <span
                aria-hidden="true"
                className="absolute top-[46%] left-[82%] size-1.5 rounded-full bg-primary/50 [animation-delay:-4s] motion-safe:animate-banner-drift"
            />

            <span className="relative flex flex-col items-center gap-2 text-muted-foreground">
                <ImageOff className="size-8" />
                {showLabel && (
                    <span className="text-xs font-medium">No banner yet</span>
                )}
            </span>
        </div>
    );
}
