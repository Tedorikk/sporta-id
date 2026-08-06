import axios from 'axios';
import { Eraser, Loader2, PenLine } from 'lucide-react';
import * as React from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface SignaturePadProps {
    value?: string | null;
    onChange?: (url: string | null) => void;
    onError?: (message: string) => void;
    disabled?: boolean;
    className?: string;
    uploadUrl?: string;
}

/**
 * Draw-to-sign canvas. Strokes are tracked with plain pointer events scoped
 * to the canvas (no window listeners needed — unlike the ID card designer's
 * drag gestures, a signature stroke only exists while the pointer is over
 * the canvas). On release the canvas is exported as a PNG and uploaded
 * through the same endpoint photo/document fields already use, so the
 * result is just another URL stored in form_data.
 */
export function SignaturePad({ value, onChange, onError, disabled, className, uploadUrl = '/public-upload/image' }: SignaturePadProps) {
    const canvasRef = React.useRef<HTMLCanvasElement>(null);
    const drawingRef = React.useRef(false);
    const hasStrokeRef = React.useRef(false);
    const [isUploading, setIsUploading] = React.useState(false);

    function getContext() {
        return canvasRef.current?.getContext('2d') ?? null;
    }

    function pointFromEvent(e: React.PointerEvent<HTMLCanvasElement>) {
        const rect = canvasRef.current!.getBoundingClientRect();

        return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    }

    function handlePointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
        if (disabled || isUploading) {
            return;
        }

        const ctx = getContext();

        if (!ctx) {
            return;
        }

        e.currentTarget.setPointerCapture(e.pointerId);
        drawingRef.current = true;

        const { x, y } = pointFromEvent(e);
        ctx.beginPath();
        ctx.moveTo(x, y);
    }

    function handlePointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
        if (!drawingRef.current) {
            return;
        }

        const ctx = getContext();

        if (!ctx) {
            return;
        }

        const { x, y } = pointFromEvent(e);
        ctx.lineTo(x, y);
        ctx.strokeStyle = '#171717';
        ctx.lineWidth = 2.5;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.stroke();
        hasStrokeRef.current = true;
    }

    async function handlePointerUp() {
        if (!drawingRef.current) {
            return;
        }

        drawingRef.current = false;

        if (!hasStrokeRef.current) {
            return;
        }

        const canvas = canvasRef.current;

        if (!canvas) {
            return;
        }

        setIsUploading(true);

        canvas.toBlob(async (blob) => {
            if (!blob) {
                setIsUploading(false);

                return;
            }

            try {
                const formData = new FormData();
                formData.append('image', blob, 'signature.png');

                const { data } = await axios.post(uploadUrl, formData, {
                    headers: { 'Content-Type': 'multipart/form-data' },
                });

                onChange?.(data.url);
            } catch (err) {
                onError?.(`Couldn't save signature. Please try again. ${err instanceof Error ? err.message : String(err)}`);
            } finally {
                setIsUploading(false);
            }
        }, 'image/png');
    }

    function handleClear() {
        const ctx = getContext();
        const canvas = canvasRef.current;

        if (!ctx || !canvas) {
            return;
        }

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        hasStrokeRef.current = false;
        onChange?.(null);
    }

    return (
        <div className={cn('space-y-2', className)}>
            {value ? (
                <div className="relative rounded-lg border-2 border-black bg-white p-2">
                    <img src={value} alt="Signature" className="h-32 w-full object-contain" />
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute top-1 right-1"
                        onClick={handleClear}
                        disabled={disabled}
                    >
                        <Eraser className="mr-1 h-3.5 w-3.5" />
                        Clear
                    </Button>
                </div>
            ) : (
                <div className="relative rounded-lg border-2 border-dashed border-black/40 bg-white">
                    <canvas
                        ref={canvasRef}
                        width={480}
                        height={160}
                        className="h-32 w-full touch-none rounded-lg"
                        onPointerDown={handlePointerDown}
                        onPointerMove={handlePointerMove}
                        onPointerUp={handlePointerUp}
                        onPointerLeave={handlePointerUp}
                    />
                    <div className="pointer-events-none absolute inset-x-0 bottom-2 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
                        {isUploading ? (
                            <>
                                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Saving…
                            </>
                        ) : (
                            <>
                                <PenLine className="h-3.5 w-3.5" /> Sign here
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
