import { router } from '@inertiajs/react';
import { Edit2, Loader2 } from 'lucide-react';
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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import type { BasketballEventCategory } from '@/types/basketball-event-category';
import type { Event } from '@/types/event';
import type { GameMatch, MatchStatus } from '@/types/game-match';

export function ScoreDialog({
    event,
    category,
    match,
}: {
    event: Event;
    category: BasketballEventCategory;
    match: GameMatch;
}) {
    const [open, setOpen] = useState(false);
    const [homeScore, setHomeScore] = useState(String(match.home_score ?? 0));
    const [awayScore, setAwayScore] = useState(String(match.away_score ?? 0));
    const [status, setStatus] = useState<MatchStatus>(match.status);
    const [saving, setSaving] = useState(false);

    const homeName = match.home_team?.name ?? 'TBD';
    const awayName = match.away_team?.name ?? 'TBD';

    const handleSave = () => {
        setSaving(true);
        router.patch(
            `/dashboard/events/${event.id}/basketball-categories/${category.id}/matches/${match.id}/score`,
            {
                home_score: Number(homeScore),
                away_score: Number(awayScore),
                status,
            },
            {
                preserveScroll: true,
                onSuccess: () => setOpen(false),
                onFinish: () => setSaving(false),
            },
        );
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 gap-1 px-2 text-xs"
                >
                    <Edit2 className="h-3 w-3" />
                    Score
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-sm">
                <DialogHeader>
                    <DialogTitle>Update Score</DialogTitle>
                    <DialogDescription>
                        {homeName} vs {awayName}
                    </DialogDescription>
                </DialogHeader>

                <div className="grid grid-cols-3 items-center gap-3">
                    <div className="flex flex-col items-center gap-1">
                        <span className="max-w-full truncate text-xs font-medium text-muted-foreground">
                            {homeName}
                        </span>
                        <Input
                            id="home-score"
                            type="number"
                            min={0}
                            value={homeScore}
                            onChange={(e) => setHomeScore(e.target.value)}
                            className="h-14 text-center text-xl font-bold"
                        />
                    </div>
                    <div className="flex items-center justify-center pt-5 text-lg font-bold text-muted-foreground">
                        vs
                    </div>
                    <div className="flex flex-col items-center gap-1">
                        <span className="max-w-full truncate text-xs font-medium text-muted-foreground">
                            {awayName}
                        </span>
                        <Input
                            id="away-score"
                            type="number"
                            min={0}
                            value={awayScore}
                            onChange={(e) => setAwayScore(e.target.value)}
                            className="h-14 text-center text-xl font-bold"
                        />
                    </div>
                </div>

                <div className="flex flex-col gap-1.5">
                    <Label htmlFor="match-status">Status</Label>
                    <Select
                        value={status}
                        onValueChange={(v) => setStatus(v as MatchStatus)}
                    >
                        <SelectTrigger id="match-status">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="scheduled">Scheduled</SelectItem>
                            <SelectItem value="ongoing">Ongoing</SelectItem>
                            <SelectItem value="finished">Completed</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => setOpen(false)}>
                        Cancel
                    </Button>
                    <Button onClick={handleSave} disabled={saving}>
                        {saving && (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        )}
                        Save Score
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
