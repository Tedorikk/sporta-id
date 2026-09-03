import type { ReactNode } from 'react';
import { ZoomableImage } from './zoomable-image';
import type { Lightbox } from './zoomable-image';

interface ResultPersonHeaderProps {
    photo?: string | null;
    name: string;
    badges?: ReactNode;
    subtitle?: ReactNode;
    onImageOpen: (image: Lightbox) => void;
}

/** Shared "photo + name + badges + subtitle" header used by team/attendee/registration result cards. */
export function ResultPersonHeader({
    photo,
    name,
    badges,
    subtitle,
    onImageOpen,
}: ResultPersonHeaderProps) {
    return (
        <div className="flex items-start gap-5">
            <ZoomableImage
                src={photo}
                alt={name}
                onOpen={onImageOpen}
                className="h-32 w-32 shrink-0 rounded-xl shadow"
                fallback={
                    <div className="flex h-full w-full items-center justify-center rounded-xl bg-primary/10 text-4xl font-extrabold text-primary shadow">
                        {name.substring(0, 2).toUpperCase()}
                    </div>
                }
            />
            <div className="flex flex-1 flex-col gap-1.5">
                <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-3xl font-extrabold tracking-tight">
                        {name}
                    </h2>
                    {badges}
                </div>
                {subtitle}
            </div>
        </div>
    );
}
