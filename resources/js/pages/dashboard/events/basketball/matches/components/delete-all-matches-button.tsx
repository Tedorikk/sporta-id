import { router } from '@inertiajs/react';
import { Trash2 } from 'lucide-react';
import { useState } from 'react';
import { DeleteConfirmationDialog } from '@/components/delete-confirmation-dialog';
import { Button } from '@/components/ui/button';
import type { BasketballEventCategory } from '@/types/basketball-event-category';
import type { Event } from '@/types/event';

export function DeleteAllMatchesButton({
    event,
    category,
    hasMatches,
}: {
    event: Event;
    category: BasketballEventCategory;
    hasMatches: boolean;
}) {
    const [isDeleting, setIsDeleting] = useState(false);

    if (!hasMatches) {
        return null;
    }

    const handleDelete = () => {
        setIsDeleting(true);
        router.delete(
            `/dashboard/events/${event.id}/basketball-categories/${category.id}/matches`,
            { preserveScroll: true, onFinish: () => setIsDeleting(false) },
        );
    };

    return (
        <DeleteConfirmationDialog
            trigger={
                <Button
                    size="sm"
                    variant="outline"
                    className="text-destructive hover:text-destructive"
                >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete All
                </Button>
            }
            title="Delete all matches in this category?"
            confirmationValue={category.name}
            description={
                <>
                    This will permanently delete every match, score, and bracket
                    result in{' '}
                    <span className="font-semibold text-foreground">
                        {category.name}
                    </span>
                    . This action cannot be undone. Type the category name above
                    to confirm.
                </>
            }
            onConfirm={handleDelete}
            isDeleting={isDeleting}
        />
    );
}
