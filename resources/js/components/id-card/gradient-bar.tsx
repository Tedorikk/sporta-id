import { Trash2 } from 'lucide-react';
import { useRef } from 'react';
import { clamp } from '@/components/id-card/color-math';
import type { GradientStop } from '@/components/id-card/gradient';
import { serializeGradient } from '@/components/id-card/gradient';
import { usePointerDrag } from '@/components/id-card/use-pointer-drag';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface GradientBarProps {
    stops: GradientStop[];
    activeStopId: string;
    onSelect: (id: string) => void;
    onMoveStop: (id: string, offset: number) => void;
    onAddStop: (offset: number) => void;
    onRemoveStop: (id: string) => void;
}

/** Straight-line interpolation between the two stops bracketing a track position, for the bar's own preview. */
function previewGradientCss(stops: GradientStop[]): string {
    return serializeGradient({ type: 'linear', angle: 90, stops });
}

export function GradientBar({ stops, activeStopId, onSelect, onMoveStop, onAddStop, onRemoveStop }: GradientBarProps) {
    const trackRef = useRef<HTMLDivElement>(null);
    const draggingId = useRef<string | null>(null);

    const { onPointerDown } = usePointerDrag(trackRef, (fx) => {
        if (draggingId.current) {
            onMoveStop(draggingId.current, clamp(fx * 100, 0, 100));
        }
    });

    return (
        <div className="flex flex-col gap-2">
            <div
                ref={trackRef}
                className="relative h-6 w-full cursor-copy rounded-md border shadow-inner"
                style={{ background: previewGradientCss(stops) }}
                onPointerDown={(e) => {
                    if (e.target !== trackRef.current) {
                        return;
                    }

                    const rect = trackRef.current.getBoundingClientRect();
                    onAddStop(clamp(((e.clientX - rect.left) / rect.width) * 100, 0, 100));
                }}
            >
                {stops.map((stop) => (
                    <button
                        key={stop.id}
                        type="button"
                        aria-label={`Gradient stop at ${Math.round(stop.offset)}%`}
                        onPointerDown={(e) => {
                            e.stopPropagation();
                            draggingId.current = stop.id;
                            onSelect(stop.id);
                            onPointerDown(e);
                        }}
                        className={cn(
                            'absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 shadow',
                            stop.id === activeStopId ? 'z-10 scale-110 border-primary' : 'border-white',
                        )}
                        style={{ left: `${stop.offset}%`, background: stop.color }}
                    />
                ))}
            </div>

            <div className="flex items-center justify-between">
                <p className="text-[11px] text-muted-foreground">Click the bar to add a stop, drag stops to reposition.</p>
                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 shrink-0 text-muted-foreground hover:text-destructive"
                    disabled={stops.length <= 2}
                    onClick={() => onRemoveStop(activeStopId)}
                    aria-label="Remove selected stop"
                >
                    <Trash2 className="h-3.5 w-3.5" />
                </Button>
            </div>
        </div>
    );
}
