import { router } from '@inertiajs/react';
import { Loader2, RefreshCw } from 'lucide-react';
import { useState } from 'react';
import { DeleteConfirmationDialog } from '@/components/delete-confirmation-dialog';
import { Button } from '@/components/ui/button';
import type { BasketballEventCategory } from '@/types/basketball-event-category';
import type { Event } from '@/types/event';
import type { Pool } from '@/types/pool';

export function GeneratePoolButton({
    event,
    category,
    pool,
    hasMatches,
}: {
    event: Event;
    category: BasketballEventCategory;
    pool: Pool;
    hasMatches: boolean;
}) {
    const [generating, setGenerating] = useState(false);

    const handleGenerate = () => {
        setGenerating(true);
        router.post(
            `/dashboard/events/${event.id}/basketball-categories/${category.id}/pools/${pool.id}/generate`,
            {},
            { preserveScroll: true, onFinish: () => setGenerating(false) },
        );
    };

    // Generating for the first time is non-destructive, so it doesn't need a
    // typed confirmation — only regenerating (which wipes existing matches) does.
    if (!hasMatches) {
        return (
            <Button size="sm" variant="outline" onClick={handleGenerate} disabled={generating} className="h-7 text-xs">
                {generating ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5 mr-1.5" />}
                Generate
            </Button>
        );
    }

    return (
        <DeleteConfirmationDialog
            trigger={
                <Button size="sm" variant="outline" disabled={generating} className="h-7 text-xs">
                    {generating ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5 mr-1.5" />}
                    Generate
                </Button>
            }
            title={`Regenerate matches for ${pool.name}?`}
            confirmationValue={pool.name}
            description={
                <>
                    This deletes the existing matches for{' '}
                    <span className="font-semibold text-foreground">{pool.name}</span> and creates
                    a new schedule. This action cannot be undone. Type the pool name above to
                    confirm.
                </>
            }
            onConfirm={handleGenerate}
            isDeleting={generating}
        />
    );
}