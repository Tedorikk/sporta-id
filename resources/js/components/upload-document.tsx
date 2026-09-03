import axios from 'axios';
import { FileText, Upload, X } from 'lucide-react';
import * as React from 'react';
import { cn } from '@/lib/utils';

export interface UploadDocumentProps {
    value?: string | null;
    onChange?: (url: string | null) => void;
    accept?: string;
    maxSizeMB?: number;
    disabled?: boolean;
    className?: string;
    placeholder?: string;
    onError?: (message: string) => void;
    uploadUrl?: string;
    deleteUrl?: string;
}

function filenameFromUrl(url: string): string {
    try {
        const decoded = decodeURIComponent(url.split('/').pop() ?? url);

        // Stored filenames are `{uuid}.{ext}` — strip the uuid so the
        // display name reads as a file, not a random string.
        return decoded.replace(/^[0-9a-f-]{36}\./i, 'Uploaded file.');
    } catch {
        return url;
    }
}

export function UploadDocument({
    value,
    onChange,
    accept = 'application/pdf,.pdf,.doc,.docx',
    maxSizeMB = 10,
    disabled = false,
    className,
    placeholder = 'Drag & drop a file, or click to browse',
    onError,
    uploadUrl = '/upload/document',
    deleteUrl = '/upload/document',
}: UploadDocumentProps) {
    const inputRef = React.useRef<HTMLInputElement>(null);
    const [isDragging, setIsDragging] = React.useState(false);
    const [isUploading, setIsUploading] = React.useState(false);
    const [uploadProgress, setUploadProgress] = React.useState(0);
    const [uploadedName, setUploadedName] = React.useState<string | null>(null);
    const [storedPath, setStoredPath] = React.useState<string | null>(null);

    const displayName = uploadedName ?? (value ? filenameFromUrl(value) : null);

    const uploadFile = async (file: File) => {
        setIsUploading(true);
        setUploadProgress(0);

        try {
            const formData = new FormData();
            formData.append('document', file);

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
            setUploadedName(data.name ?? file.name);
            onChange?.(data.url);
        } catch (err) {
            onError?.(
                `Upload failed. Please try again. ${err instanceof Error ? err.message : String(err)}`,
            );
        } finally {
            setIsUploading(false);
            setUploadProgress(0);
        }
    };

    const validateFile = (file: File): boolean => {
        const allowedExtensions = ['pdf', 'doc', 'docx'];
        const extension = file.name.split('.').pop()?.toLowerCase();

        if (!extension || !allowedExtensions.includes(extension)) {
            onError?.(
                'Please upload a PDF or Word document (.pdf, .doc, .docx)',
            );

            return false;
        }

        if (file.size > maxSizeMB * 1024 * 1024) {
            onError?.(`File must be smaller than ${maxSizeMB}MB`);

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

        uploadFile(file);
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
        setUploadedName(null);
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

    const isBusy = disabled || isUploading;

    return (
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
            className={cn(
                'group relative flex min-h-24 w-full cursor-pointer flex-col items-center justify-center gap-2 overflow-hidden rounded-lg border-2 border-dashed p-4 text-center transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
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

            {displayName ? (
                <div className="flex w-full items-center gap-2 text-left">
                    <FileText className="h-6 w-6 shrink-0 text-muted-foreground" />
                    <span className="min-w-0 flex-1 truncate text-sm font-medium">
                        {displayName}
                    </span>
                    {!isBusy && (
                        <button
                            type="button"
                            onClick={handleClear}
                            aria-label="Remove document"
                            className="shrink-0 rounded-full bg-muted p-1 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    )}
                </div>
            ) : (
                <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    {isDragging ? (
                        <Upload className="h-6 w-6" />
                    ) : (
                        <FileText className="h-6 w-6" />
                    )}
                    <p className="text-sm">
                        {isUploading ? 'Uploading…' : placeholder}
                    </p>
                </div>
            )}

            {isUploading && (
                <div className="w-full max-w-52">
                    <div
                        role="progressbar"
                        aria-valuenow={uploadProgress}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        className="h-1.5 w-full overflow-hidden rounded-full bg-muted-foreground/20"
                    >
                        <div
                            className="h-full rounded-full bg-primary transition-[width] duration-150 ease-out"
                            style={{ width: `${uploadProgress}%` }}
                        />
                    </div>
                </div>
            )}

            {!isUploading && !displayName && (
                <p className="text-xs text-muted-foreground">
                    PDF, DOC or DOCX, up to {maxSizeMB}MB
                </p>
            )}
        </div>
    );
}
