import { router, usePage } from '@inertiajs/react';
import { Upload } from 'lucide-react';
import { useRef, useState } from 'react';
import { importMethod } from '@/actions/App/Http/Controllers/RaceResultController';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface ImportResultsDialogProps {
    eventId: number;
    categoryId: number;
}

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;

function httpErrorMessage(status: number): string {
    switch (status) {
        case 401:
        case 419:
            return 'Your session expired. Refresh the page, sign in again, and retry the import.';
        case 403:
            return 'You no longer have permission to import results for this event.';
        case 413:
            return 'The server rejected this upload because it is larger than 5 MB.';
        case 429:
            return 'Too many requests were sent. Wait a moment and try again.';
        default:
            return status >= 500
                ? 'The server could not process the import. Your file was not cleared; please try again.'
                : 'The upload received an unexpected response. Please try again or open this page in Safari, Chrome, Firefox, or Edge.';
    }
}

export function ImportResultsDialog({
    eventId,
    categoryId,
}: ImportResultsDialogProps) {
    const [open, setOpen] = useState(false);
    const [file, setFile] = useState<File | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [fileError, setFileError] = useState<string | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const uploadStartedRef = useRef(false);

    // Rows the server could not apply — an unknown bib, an unreadable time.
    // They are the whole point of the dialog staying open after an import.
    const { flash } = usePage<{ flash: { import_errors?: string[] } }>().props;
    const importErrors = flash.import_errors ?? [];

    function clearFile() {
        setFile(null);

        if (inputRef.current) {
            inputRef.current.value = '';
        }
    }

    function handleFileChange(selectedFile: File | null) {
        setFileError(null);

        if (!selectedFile) {
            clearFile();

            return;
        }

        if (selectedFile.size === 0) {
            clearFile();
            setFileError('The CSV file is empty.');

            return;
        }

        if (!selectedFile.name.toLowerCase().endsWith('.csv')) {
            clearFile();
            setFileError('Please choose a CSV file.');

            return;
        }

        if (selectedFile.size > MAX_FILE_SIZE_BYTES) {
            clearFile();
            setFileError('The results file must not be larger than 5 MB.');

            return;
        }

        setFile(selectedFile);
    }

    function handleUpload() {
        if (uploadStartedRef.current) {
            return;
        }

        if (!file) {
            setFileError('Please choose a CSV file to import.');

            return;
        }

        if (typeof navigator !== 'undefined' && navigator.onLine === false) {
            setFileError(
                'This device appears to be offline. Reconnect to the internet and try again; your selected file has been kept.',
            );

            return;
        }

        setFileError(null);
        uploadStartedRef.current = true;

        router.post(
            importMethod.url({ event: eventId, category: categoryId }),
            { file },
            {
                preserveScroll: true,
                forceFormData: true,
                onStart: () => setIsUploading(true),
                onFinish: () => {
                    uploadStartedRef.current = false;
                    setIsUploading(false);
                },
                onSuccess: () => clearFile(),
                onError: (errors) => {
                    setFileError(
                        errors.file ??
                            'The results could not be imported. Please try again.',
                    );
                },
                onNetworkError: () => {
                    setFileError(
                        'The upload was interrupted. Check your connection and try again; your selected file has been kept.',
                    );

                    return false;
                },
                onHttpException: (response) => {
                    setFileError(httpErrorMessage(response.status));

                    return false;
                },
            },
        );
    }

    return (
        <Dialog
            open={open}
            onOpenChange={(nextOpen) => {
                if (!isUploading) {
                    setOpen(nextOpen);
                }
            }}
        >
            <DialogTrigger asChild>
                <Button variant="outline">
                    <Upload className="mr-2 h-4 w-4" />
                    Import CSV
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Import results</DialogTitle>
                    <DialogDescription>
                        A CSV from your timing provider with a <code>bib</code>{' '}
                        column and a <code>time</code> column
                        (&quot;48:12&quot;, &quot;3:41:07&quot; or plain
                        seconds). An optional <code>status</code> column marks
                        DNF, DNS or DQ.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-3 py-2">
                    <Label htmlFor="results-file">Results file</Label>
                    <Input
                        ref={inputRef}
                        id="results-file"
                        type="file"
                        accept=".csv,text/csv"
                        aria-invalid={fileError ? true : undefined}
                        aria-describedby="results-file-help results-file-error"
                        onChange={(e) =>
                            handleFileChange(e.target.files?.[0] ?? null)
                        }
                    />
                    <p
                        id="results-file-help"
                        className="text-xs text-muted-foreground"
                    >
                        CSV files up to 5 MB.
                    </p>
                    <InputError
                        id="results-file-error"
                        message={fileError ?? undefined}
                        role="alert"
                        aria-live="assertive"
                    />

                    {importErrors.length > 0 && (
                        <div
                            role="status"
                            aria-live="polite"
                            className="max-h-40 overflow-y-auto rounded-md border border-destructive/40 bg-destructive/5 p-3"
                        >
                            <p className="mb-1 text-sm font-medium text-destructive">
                                Rows that could not be applied
                            </p>
                            <ul className="space-y-1 text-xs text-muted-foreground">
                                {importErrors.map((error) => (
                                    <li key={error}>{error}</li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>

                <DialogFooter>
                    <Button
                        onClick={handleUpload}
                        disabled={!file || isUploading}
                    >
                        {isUploading ? 'Importing…' : 'Import'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
