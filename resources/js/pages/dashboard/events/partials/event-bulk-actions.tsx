import { Megaphone, PencilLine, Trash2, X } from 'lucide-react';
import { DeleteConfirmationDialog } from '@/components/delete-confirmation-dialog';
import { Button } from '@/components/ui/button';

interface Props {
    count: number;
    isWorking: boolean;
    onPublish: () => void;
    onUnpublish: () => void;
    onDelete: () => void;
    onClear: () => void;
}

/**
 * Sits above the table rather than adding a control to every row, so the actions
 * cost one click for one event or for twenty-five.
 */
export function EventBulkActions({
    count,
    isWorking,
    onPublish,
    onUnpublish,
    onDelete,
    onClear,
}: Props) {
    const label = `${count} ${count === 1 ? 'event' : 'events'}`;

    return (
        <div
            role="region"
            aria-label="Bulk actions"
            className="flex flex-wrap items-center gap-2 rounded-xl border border-primary/40 bg-accent px-3 py-2"
        >
            <span className="text-sm font-medium">{label} selected</span>

            <div className="ml-auto flex flex-wrap items-center gap-2">
                <Button
                    variant="outline"
                    size="sm"
                    onClick={onPublish}
                    disabled={isWorking}
                >
                    <Megaphone className="mr-2 size-4" />
                    Publish
                </Button>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={onUnpublish}
                    disabled={isWorking}
                >
                    <PencilLine className="mr-2 size-4" />
                    Move to draft
                </Button>

                <DeleteConfirmationDialog
                    trigger={
                        <Button
                            variant="destructive"
                            size="sm"
                            disabled={isWorking}
                        >
                            <Trash2 className="mr-2 size-4" />
                            Delete
                        </Button>
                    }
                    title={`Delete ${label}?`}
                    confirmationValue="delete"
                    description={
                        <>
                            This permanently deletes{' '}
                            <span className="font-semibold text-foreground">
                                {label}
                            </span>{' '}
                            and everything attached. This action cannot be
                            undone. Type{' '}
                            <span className="font-semibold text-foreground">
                                delete
                            </span>{' '}
                            to confirm.
                        </>
                    }
                    onConfirm={onDelete}
                    isDeleting={isWorking}
                />

                <Button
                    variant="ghost"
                    size="sm"
                    onClick={onClear}
                    disabled={isWorking}
                >
                    <X className="mr-2 size-4" />
                    Clear
                </Button>
            </div>
        </div>
    );
}
