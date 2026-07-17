import axios from 'axios';
import { Upload, X, ImageIcon } from 'lucide-react';
import * as React from 'react';
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
import { Slider } from '@/components/ui/slider';
import { getCroppedImageFile } from '@/lib/crop-image';
import { cn } from '@/lib/utils';

export interface UploadImageProps {
    value?: string | null;
    onChange?: (url: string | null) => void;
    ratio?: number;
    width?: number | string;
    height?: number | string;
    accept?: string;
    maxSizeMB?: number;
    disabled?: boolean;
    className?: string;
    placeholder?: string;
    onError?: (message: string) => void;
    uploadUrl?: string;
    deleteUrl?: string;
    /** NEW: open a crop dialog (locked to `ratio`) before uploading. Default: false. */
    enableCrop?: boolean;
}

export function UploadImage({
    value,
    onChange,
    ratio = 1,
    width,
    height,
    accept = 'image/png,image/jpeg,image/webp',
    maxSizeMB = 5,
    disabled = false,
    className,
    placeholder = 'Drag & drop an image, or click to browse',
    onError,
    uploadUrl = '/upload/image',
    deleteUrl = '/upload/image',
    enableCrop = false, // NEW
}: UploadImageProps) {
    const inputRef = React.useRef<HTMLInputElement>(null);
    const [isDragging, setIsDragging] = React.useState(false);
    const [isUploading, setIsUploading] = React.useState(false);
    const [uploadProgress, setUploadProgress] = React.useState(0);
    const [localPreview, setLocalPreview] = React.useState<string | null>(null);
    const [storedPath, setStoredPath] = React.useState<string | null>(null);

    // --- NEW: crop dialog state ---
    const [cropperOpen, setCropperOpen] = React.useState(false);
    const [cropSrc, setCropSrc] = React.useState<string | null>(null);
    const [crop, setCrop] = React.useState({ x: 0, y: 0 });
    const [zoom, setZoom] = React.useState(1);
    const [croppedAreaPixels, setCroppedAreaPixels] =
        React.useState<Area | null>(null);
    const [isCropProcessing, setIsCropProcessing] = React.useState(false);
    // --- end new state ---

    React.useEffect(() => {
        return () => {
            if (localPreview) {
                URL.revokeObjectURL(localPreview);
            }
        };
    }, [localPreview]);

    // NEW: also clean up the crop-source object URL
    React.useEffect(() => {
        return () => {
            if (cropSrc) {
                URL.revokeObjectURL(cropSrc);
            }
        };
    }, [cropSrc]);

    const previewUrl = localPreview ?? value ?? null;

    const uploadFile = async (file: File) => {
        setIsUploading(true);
        setUploadProgress(0);
        const objectUrl = URL.createObjectURL(file);
        setLocalPreview(objectUrl);

        try {
            const formData = new FormData();
            formData.append('image', file);

            const { data } = await axios.post(uploadUrl, formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
                onUploadProgress: (progressEvent) => {
                    if (!progressEvent.total) {
                        return;
                    }

                    setUploadProgress(
                        Math.round(
                            (progressEvent.loaded * 100) / progressEvent.total,
                        ),
                    );
                },
            });

            setStoredPath(data.path ?? null);
            onChange?.(data.url);
            setLocalPreview(null);
        } catch (err) {
            onError?.(
                `Upload failed. Please try again. ${err instanceof Error ? err.message : String(err)}`,
            );
            setLocalPreview(null);
        } finally {
            setIsUploading(false);
            setUploadProgress(0);
        }
    };

    const validateFile = (file: File): boolean => {
        if (!file.type.startsWith('image/')) {
            onError?.('Please upload an image file');

            return false;
        }

        if (file.size > maxSizeMB * 1024 * 1024) {
            onError?.(`Image must be smaller than ${maxSizeMB}MB`);

            return false;
        }

        return true;
    };

    const handleFiles = (files: FileList | null) => {
        if (!files || files.length === 0 || disabled || isUploading) {
            return;
        }

        const file = files[0];

        if (!validateFile(file)) {
            return;
        }

        // NEW: route through the cropper instead of uploading immediately
        if (enableCrop) {
            setCropSrc(URL.createObjectURL(file));
            setCrop({ x: 0, y: 0 });
            setZoom(1);
            setCroppedAreaPixels(null);
            setCropperOpen(true);

            return;
        }

        uploadFile(file);
    };

    // NEW: called when the user confirms the crop
    const handleCropConfirm = async () => {
        if (!cropSrc || !croppedAreaPixels) {
            return;
        }

        setIsCropProcessing(true);

        try {
            const croppedFile = await getCroppedImageFile(
                cropSrc,
                croppedAreaPixels,
            );
            await uploadFile(croppedFile);
        } catch {
            onError?.('Could not crop image. Please try again.');
        } finally {
            setIsCropProcessing(false);
            setCropperOpen(false);

            if (cropSrc) {
                URL.revokeObjectURL(cropSrc);
            }

            setCropSrc(null);

            if (inputRef.current) {
                inputRef.current.value = '';
            }
        }
    };

    // NEW: called when the user cancels the crop
    const handleCropCancel = () => {
        setCropperOpen(false);

        if (cropSrc) {
            URL.revokeObjectURL(cropSrc);
        }

        setCropSrc(null);

        if (inputRef.current) {
            inputRef.current.value = '';
        }
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDragging(false);

        if (disabled || isUploading) {
            return;
        }

        handleFiles(e.dataTransfer.files);
    };

    const handleClear = async (e: React.MouseEvent) => {
        e.stopPropagation();
        const pathToDelete = storedPath;
        setLocalPreview(null);
        setStoredPath(null);
        onChange?.(null);

        if (inputRef.current) {
            inputRef.current.value = '';
        }

        if (pathToDelete) {
            try {
                await axios.delete(deleteUrl, { data: { path: pathToDelete } });
            } catch {
                // Non-fatal: the form field is already cleared either way.
            }
        }
    };

    const boxStyle: React.CSSProperties =
        width && height
            ? { width, height }
            : {
                  aspectRatio: ratio,
                  width: width ?? (height ? 'auto' : '100%'),
                  height: height ?? 'auto',
              };

    const isBusy = disabled || isUploading;

    return (
        <>
            <div
                role="button"
                tabIndex={isBusy ? -1 : 0}
                aria-disabled={isBusy}
                aria-busy={isUploading}
                onClick={() => !isBusy && inputRef.current?.click()}
                onKeyDown={(e) => {
                    if ((e.key === 'Enter' || e.key === ' ') && !isBusy) {
                        e.preventDefault();
                        inputRef.current?.click();
                    }
                }}
                onDragOver={(e) => {
                    e.preventDefault();

                    if (!isBusy) {
                        setIsDragging(true);
                    }
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                style={boxStyle}
                className={cn(
                    'group relative flex cursor-pointer flex-col items-center justify-center overflow-hidden rounded-lg border-2 border-dashed transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
                    isDragging
                        ? 'border-primary bg-primary/5'
                        : 'border-muted-foreground/25 hover:border-muted-foreground/50',
                    isBusy && 'cursor-not-allowed opacity-75',
                    className,
                )}
            >
                <input
                    ref={inputRef}
                    type="file"
                    accept={accept}
                    disabled={isBusy}
                    className="hidden"
                    onChange={(e) => handleFiles(e.target.files)}
                />

                {previewUrl ? (
                    <>
                        <img
                            src={previewUrl}
                            alt="Preview"
                            className="h-full w-full object-cover"
                        />
                        {isUploading && (
                            <div className="absolute inset-x-0 bottom-0 bg-black/70 px-3 py-2 backdrop-blur-sm">
                                <div className="mb-1 flex items-center justify-between text-xs font-medium text-white">
                                    <span>Uploading…</span>
                                    <span>{uploadProgress}%</span>
                                </div>
                                <div
                                    role="progressbar"
                                    aria-valuenow={uploadProgress}
                                    aria-valuemin={0}
                                    aria-valuemax={100}
                                    className="h-1.5 w-full overflow-hidden rounded-full bg-white/25"
                                >
                                    <div
                                        className="h-full rounded-full bg-white transition-[width] duration-150 ease-out"
                                        style={{ width: `${uploadProgress}%` }}
                                    />
                                </div>
                            </div>
                        )}
                        {!isBusy && (
                            <button
                                type="button"
                                onClick={handleClear}
                                aria-label="Remove image"
                                className="absolute top-2 right-2 rounded-full bg-black/60 p-1 text-white opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        )}
                    </>
                ) : (
                    <div className="flex w-full flex-col items-center gap-2 px-6 text-center text-muted-foreground">
                        {isDragging ? (
                            <Upload className="h-6 w-6" />
                        ) : (
                            <ImageIcon className="h-6 w-6" />
                        )}
                        <p className="text-sm">
                            {isUploading ? 'Uploading…' : placeholder}
                        </p>
                        {isUploading ? (
                            <div
                                role="progressbar"
                                aria-valuenow={uploadProgress}
                                aria-valuemin={0}
                                aria-valuemax={100}
                                className="h-1.5 w-full max-w-40 overflow-hidden rounded-full bg-muted-foreground/20"
                            >
                                <div
                                    className="h-full rounded-full bg-primary transition-[width] duration-150 ease-out"
                                    style={{ width: `${uploadProgress}%` }}
                                />
                            </div>
                        ) : (
                            <p className="text-xs">
                                PNG, JPG or WEBP, up to {maxSizeMB}MB
                            </p>
                        )}
                    </div>
                )}
            </div>

            {/* NEW: crop dialog, only rendered when enableCrop is on */}
            {enableCrop && (
                <Dialog
                    open={cropperOpen}
                    onOpenChange={(open) => !open && handleCropCancel()}
                >
                    <DialogContent className="sm:max-w-lg">
                        <DialogHeader>
                            <DialogTitle>Crop image</DialogTitle>
                        </DialogHeader>

                        <div className="relative h-80 w-full bg-muted">
                            {cropSrc && (
                                <Cropper
                                    image={cropSrc}
                                    crop={crop}
                                    zoom={zoom}
                                    aspect={ratio}
                                    onCropChange={setCrop}
                                    onZoomChange={setZoom}
                                    onCropComplete={(_area, pixels) =>
                                        setCroppedAreaPixels(pixels)
                                    }
                                />
                            )}
                        </div>

                        <div className="flex items-center gap-3 px-1">
                            <span className="text-sm text-muted-foreground">
                                Zoom
                            </span>
                            <Slider
                                min={1}
                                max={3}
                                step={0.1}
                                value={[zoom]}
                                onValueChange={([v]) => setZoom(v)}
                            />
                        </div>

                        <DialogFooter>
                            <Button
                                variant="outline"
                                onClick={handleCropCancel}
                            >
                                Cancel
                            </Button>
                            <Button
                                onClick={handleCropConfirm}
                                disabled={isCropProcessing}
                            >
                                {isCropProcessing
                                    ? 'Cropping…'
                                    : 'Apply crop & upload'}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            )}
        </>
    );
}
