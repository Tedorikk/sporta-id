import { CheckCircle2, Clock, Play } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { MatchStatus } from '@/types/game-match';

export const ROUND_LABELS: Record<string, string> = {
    group: 'Group Stage',
    round_of_16: 'Round of 16',
    quarterfinal: 'Quarterfinal',
    semifinal: 'Semifinal',
    final: 'Final',
};

export const ROUND_OPTIONS: { value: string; label: string }[] = [
    { value: 'group', label: 'Group' },
    { value: 'round_of_16', label: 'Round of 16' },
    { value: 'quarterfinal', label: 'Quarter Final' },
    { value: 'semifinal', label: 'Semi Final' },
    { value: 'final', label: 'Final' },
];

export function StatusBadge({ status }: { status: MatchStatus }) {
    if (status === 'finished') {
        return (
            <Badge className="border-emerald-500/25 bg-emerald-500/15 text-emerald-600">
                <CheckCircle2 className="mr-1 h-3 w-3" />
                Completed
            </Badge>
        );
    }

    if (status === 'ongoing') {
        return (
            <Badge className="border-amber-500/25 bg-amber-500/15 text-amber-600">
                <Play className="mr-1 h-3 w-3" />
                Ongoing
            </Badge>
        );
    }

    return (
        <Badge variant="secondary">
            <Clock className="mr-1 h-3 w-3" />
            Scheduled
        </Badge>
    );
}
