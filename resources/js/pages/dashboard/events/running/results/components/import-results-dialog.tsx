import { router, usePage } from '@inertiajs/react';
import { Upload } from 'lucide-react';
import { useState } from 'react';
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

export function ImportResultsDialog({
    eventId,
    categoryId,
}: ImportResultsDialogProps) {
    const [open, setOpen] = useState(false);
    const [file, setFile] = useState<File | null>(null);
    const [isUploading, setIsUploading] = useState(false);

    // Rows the server could not apply — an unknown bib, an unreadable time.
    // They are the whole point of the dialog staying open after an import.
    const { flash } = usePage<{ flash: { import_errors?: string[] } }>().props;
    const importErrors = flash.import_errors ?? [];

    function handleUpload() {
        if (!file) {
            return;
        }

        router.post(
            `/dashboard/events/${eventId}/running-categories/${categoryId}/results/import`,
            { file },
            {
                preserveScroll: true,
                forceFormData: true,
                onStart: () => setIsUploading(true),
                onFinish: () => setIsUploading(false),
                onSuccess: () => setFile(null),
            },
        );
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
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
                        id="results-file"
                        type="file"
                        accept=".csv,text/csv"
                        onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                    />

                    {importErrors.length > 0 && (
                        <div className="max-h-40 overflow-y-auto rounded-md border border-destructive/40 bg-destructive/5 p-3">
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
