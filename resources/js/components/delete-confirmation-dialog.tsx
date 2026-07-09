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

type DeleteConfirmationDialogProps = {
    trigger: React.ReactNode;
    title?: string;
    description?: React.ReactNode;
    /** The exact string the user must type to enable the delete button, e.g. the event's name */
    confirmationValue: string;
    onConfirm: () => void;
    isDeleting?: boolean;
};

export function DeleteConfirmationDialog({
    trigger,
    title = 'Are you absolutely sure?',
    description,
    confirmationValue,
    onConfirm,
    isDeleting = false,
}: DeleteConfirmationDialogProps) {
    const [open, setOpen] = useState(false);
    const [inputValue, setInputValue] = useState('');

    const isMatch = inputValue === confirmationValue;

    const handleConfirm = () => {
        if (!isMatch) {
            return;
        }

        onConfirm();
    };

    const handleOpenChange = (nextOpen: boolean) => {
        setOpen(nextOpen);

        if (!nextOpen) {
            // reset input when dialog closes, so it doesn't linger pre-filled next time
            setInputValue('');
        }
    };

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>{trigger}</DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                    <DialogDescription>
                        {description ?? (
                            <>
                                This action cannot be undone. Please type{' '}
                                <span className="font-semibold text-foreground">
                                    {confirmationValue}
                                </span>{' '}
                                to confirm.
                            </>
                        )}
                    </DialogDescription>
                </DialogHeader>

                <div className="flex flex-col gap-2 py-2">
                    <Label htmlFor="delete-confirmation-input">
                        Type to confirm
                    </Label>
                    <Input
                        id="delete-confirmation-input"
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        placeholder={confirmationValue}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && isMatch && !isDeleting) {
                                handleConfirm();
                            }
                        }}
                        autoComplete="off"
                        autoFocus
                    />
                </div>

                <DialogFooter>
                    <Button
                        variant="outline"
                        onClick={() => handleOpenChange(false)}
                        disabled={isDeleting}
                    >
                        Cancel
                    </Button>
                    <Button
                        variant="destructive"
                        onClick={handleConfirm}
                        disabled={!isMatch || isDeleting}
                    >
                        {isDeleting ? 'Deleting...' : 'Delete'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
