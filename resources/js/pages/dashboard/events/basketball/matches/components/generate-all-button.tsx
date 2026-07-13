import { router } from '@inertiajs/react';
import { Loader2, RefreshCw } from 'lucide-react';
import { useState } from 'react';
import { DeleteConfirmationDialog } from '@/components/delete-confirmation-dialog';
import { Button } from '@/components/ui/button';
import type { BasketballEventCategory } from '@/types/basketball-event-category';
import type { Event } from '@/types/event';

export function GenerateAllButton({
    event,
    category,
    hasMatches,
}: {
    event: Event;
    category: BasketballEventCategory;
    hasMatches: boolean;
}) {
    const [generating, setGenerating] = useState(false);

    const handleGenerate = () => {
        setGenerating(true);
        router.post(
            `/dashboard/events/${event.id}/basketball-categories/${category.id}/matches/generate`,
            {},
            { preserveScroll: true, onFinish: () => setGenerating(false) },
        );
    };

    // Generating for the first time is non-destructive, so it doesn't need a
    // typed confirmation — only regenerating (which wipes existing matches) does.
    if (!hasMatches) {
        return (
            <Button size="sm" onClick={handleGenerate} disabled={generating}>
                {generating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                Generate Schedule
            </Button>
        );
    }

    return (
        <DeleteConfirmationDialog
            trigger={
                <Button size="sm" variant="outline" disabled={generating}>
                    {generating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                    Regenerate
                </Button>
            }
            title="Regenerate the schedule?"
            confirmationValue={category.name}
            description={
                <>
                    This deletes all existing matches in{' '}
                    <span className="font-semibold text-foreground">{category.name}</span> and
                    creates a new round-robin schedule. This action cannot be undone. Type the
                    category name above to confirm.
                </>
            }
            onConfirm={handleGenerate}
            isDeleting={generating}
        />
    );
}