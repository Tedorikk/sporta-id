import { useState, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import type { Area } from 'react-easy-crop';

import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';

import { getCroppedImageFile } from '@/lib/crop-image';
import { Slider } from '@/components/ui/slider';

interface ImageCropperDialogProps {
    open: boolean;
    imageSrc: string | null;
    aspect: number;
    onCancel: () => void;
    onCropComplete: (file: File) => void;
}

export function ImageCropperDialog({
    open,
    imageSrc,
    aspect,
    onCancel,
    onCropComplete,
}: ImageCropperDialogProps) {
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(
        null,
    );
    const [isProcessing, setIsProcessing] = useState(false);

    const handleCropComplete = useCallback(
        (_croppedArea: Area, croppedAreaPixelsValue: Area) => {
            setCroppedAreaPixels(croppedAreaPixelsValue);
        },
        [],
    );

    const handleConfirm = async () => {
        if (!imageSrc || !croppedAreaPixels) {
            return;
        }

        setIsProcessing(true);

        try {
            const file = await getCroppedImageFile(imageSrc, croppedAreaPixels);
            onCropComplete(file);
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={(o) => !o && onCancel()}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>Crop banner image</DialogTitle>
                </DialogHeader>

                <div className="relative h-80 w-full bg-muted">
                    {imageSrc && (
                        <Cropper
                            image={imageSrc}
                            crop={crop}
                            zoom={zoom}
                            aspect={aspect}
                            onCropChange={setCrop}
                            onZoomChange={setZoom}
                            onCropComplete={handleCropComplete}
                        />
                    )}
                </div>

                <div className="flex items-center gap-3 px-1">
                    <span className="text-sm text-muted-foreground">Zoom</span>
                    <Slider
                        min={1}
                        max={3}
                        step={0.1}
                        value={[zoom]}
                        onValueChange={([v]) => setZoom(v)}
                    />
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onCancel}>
                        Cancel
                    </Button>
                    <Button onClick={handleConfirm} disabled={isProcessing}>
                        {isProcessing ? 'Cropping...' : 'Apply crop'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
