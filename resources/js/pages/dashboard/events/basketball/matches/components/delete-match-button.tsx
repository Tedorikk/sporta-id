import { router } from '@inertiajs/react';
import { Trash2 } from 'lucide-react';
import { useState } from 'react';
import { DeleteConfirmationDialog } from '@/components/delete-confirmation-dialog';
import { Button } from '@/components/ui/button';
import type { BasketballEventCategory } from '@/types/basketball-event-category';
import type { Event } from '@/types/event';
import type { GameMatch } from '@/types/game-match';

export function DeleteMatchButton({
    event,
    category,
    match,
}: {
    event: Event;
    category: BasketballEventCategory;
    match: GameMatch;
}) {
    const [isDeleting, setIsDeleting] = useState(false);

    const homeName = match.home_team?.name ?? 'TBD';
    const awayName = match.away_team?.name ?? 'TBD';
    const matchLabel = `${homeName} vs ${awayName}`;

    const handleDelete = () => {
        setIsDeleting(true);
        router.delete(
            `/dashboard/events/${event.id}/basketball-categories/${category.id}/matches/${match.id}`,
            { preserveScroll: true, onFinish: () => setIsDeleting(false) },
        );
    };

    return (
        <DeleteConfirmationDialog
            trigger={
                <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                    aria-label="Delete match"
                >
                    <Trash2 className="h-3.5 w-3.5" />
                </Button>
            }
            title="Delete this match?"
            confirmationValue={matchLabel}
            description={
                <>
                    This will permanently delete{' '}
                    <span className="font-semibold text-foreground">{matchLabel}</span>. This
                    action cannot be undone. Type the matchup above to confirm.
                </>
            }
            onConfirm={handleDelete}
            isDeleting={isDeleting}
        />
    );
}