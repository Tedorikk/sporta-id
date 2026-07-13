import { router } from '@inertiajs/react';
import { Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { BasketballEventCategory } from '@/types/basketball-event-category';
import type { Event } from '@/types/event';
import type { Pool } from '@/types/pool';
import type { Team } from '@/types/team';
import { ROUND_OPTIONS } from './constants';

export function CreateMatchDialog({
    event,
    category,
    pools,
    teams,
    defaultPool,
}: {
    event: Event;
    category: BasketballEventCategory;
    pools: Pool[];
    teams: Team[];
    defaultPool?: Pool;
}) {
    const [open, setOpen] = useState(false);
    const [saving, setSaving] = useState(false);

    const [poolId, setPoolId] = useState(defaultPool ? String(defaultPool.id) : '');
    const [homeTeamId, setHomeTeamId] = useState('');
    const [awayTeamId, setAwayTeamId] = useState('');
    const [round, setRound] = useState('group');
    const [matchNumber, setMatchNumber] = useState('');
    const [date, setDate] = useState('');
    const [time, setTime] = useState('');

    // Reset the whole form whenever the dialog is (re)opened, so stale state
    // from a previous match never leaks into the next one.
    useEffect(() => {
        if (!open) return;

        setPoolId(defaultPool ? String(defaultPool.id) : '');
        setHomeTeamId('');
        setAwayTeamId('');
        setRound('group');
        setMatchNumber('');
        setDate('');
        setTime('');
    }, [open, defaultPool]);

    useEffect(() => {
        setHomeTeamId('');
        setAwayTeamId('');
    }, [poolId]);

    useEffect(() => {
        if (homeTeamId && homeTeamId === awayTeamId) {
            setAwayTeamId('');
        }
    }, [homeTeamId, awayTeamId]);

    const availableTeams = poolId === ''
        ? teams
        : (pools.find((p) => String(p.id) === poolId)?.teams ?? []);

    const canSubmit = Boolean(homeTeamId && awayTeamId && homeTeamId !== awayTeamId && round);

    const handleSubmit = () => {
        if (!canSubmit) return;

        setSaving(true);
        router.post(
            `/dashboard/events/${event.id}/basketball-categories/${category.id}/matches`,
            {
                pool_id: poolId || null,
                home_team_id: homeTeamId,
                away_team_id: awayTeamId,
                round,
                match_number: matchNumber || null,
                scheduled_at: date && time ? `${date} ${time}` : null,
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
                <Button size="sm">+ New Match</Button>
            </DialogTrigger>

            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Create Match</DialogTitle>
                </DialogHeader>

                <div className="space-y-4">
                    {!defaultPool && (
                        <div>
                            <Label>Pool</Label>
                            <Select value={poolId} onValueChange={setPoolId}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select Pool" />
                                </SelectTrigger>
                                <SelectContent>
                                    {pools.map((pool) => (
                                        <SelectItem key={pool.id} value={String(pool.id)}>
                                            {pool.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    )}

                    <div>
                        <Label>Home Team</Label>
                        <Select value={homeTeamId} onValueChange={setHomeTeamId}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select Team" />
                            </SelectTrigger>
                            <SelectContent>
                                {availableTeams.map((team) => (
                                    <SelectItem key={team.id} value={String(team.id)}>
                                        {team.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div>
                        <Label>Away Team</Label>
                        <Select value={awayTeamId} onValueChange={setAwayTeamId}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select Team" />
                            </SelectTrigger>
                            <SelectContent>
                                {availableTeams
                                    .filter((team) => String(team.id) !== homeTeamId)
                                    .map((team) => (
                                        <SelectItem key={team.id} value={String(team.id)}>
                                            {team.name}
                                        </SelectItem>
                                    ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div>
                        <Label>Round</Label>
                        <Select value={round} onValueChange={setRound}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {ROUND_OPTIONS.map((option) => (
                                    <SelectItem key={option.value} value={option.value}>
                                        {option.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div>
                        <Label>Match Number</Label>
                        <Input
                            type="number"
                            value={matchNumber}
                            placeholder="Auto-assigned if left blank"
                            onChange={(e) => setMatchNumber(e.target.value)}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                        <div>
                            <Label>Date</Label>
                            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
                        </div>
                        <div>
                            <Label>Time</Label>
                            <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
                        </div>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                    <Button onClick={handleSubmit} disabled={saving || !canSubmit}>
                        {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                        Create
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}