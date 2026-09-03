import { useForm } from '@inertiajs/react';
import { UserCheck } from 'lucide-react';
import { useMemo, useState } from 'react';
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
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import type { Event } from '@/types/event';
import { playerRoleLabel } from '@/types/player';
import type { Player } from '@/types/player';
import type { Team } from '@/types/team';

// Adjust based on your actual Club type definition
export interface BasketballClub {
    id: number;
    name: string;
    player?: Player[];
}

interface AddExistingPlayerDialogProps {
    event: Event;
    team: Team;
    clubs: BasketballClub[];
    trigger: React.ReactNode;
}

export function AddExistingPlayerDialog({
    event,
    team,
    clubs,
    trigger,
}: AddExistingPlayerDialogProps) {
    const [open, setOpen] = useState(false);
    const [selectedClubId, setSelectedClubId] = useState<string>('');

    const { data, setData, post, processing, reset, errors } = useForm({
        player_id: '',
    });

    // Get the selected club
    const selectedClub = useMemo(() => {
        return clubs.find((c) => c.id.toString() === selectedClubId);
    }, [clubs, selectedClubId]);

    // Filter out players that are already on THIS team
    const availablePlayers = useMemo(() => {
        if (!selectedClub?.player) {
            return [];
        }

        const existingPlayerIds = new Set(team.players?.map((p) => p.id) ?? []);

        return selectedClub.player.filter((p) => !existingPlayerIds.has(p.id));
    }, [selectedClub, team.players]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post(`/dashboard/events/${event.id}/teams/${team.id}/players/attach`, {
            preserveScroll: true,
            onSuccess: () => {
                setOpen(false);
                reset();
                setSelectedClubId('');
            },
        });
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>{trigger}</DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle>Add Existing Player</DialogTitle>
                        <DialogDescription>
                            Select a basketball club to find and add an existing
                            registered player to {team.name}.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="club">Basketball Club</Label>
                            <Select
                                value={selectedClubId}
                                onValueChange={(val) => {
                                    setSelectedClubId(val);
                                    setData('player_id', ''); // reset player selection when club changes
                                }}
                            >
                                <SelectTrigger id="club">
                                    <SelectValue placeholder="Select a club..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {clubs.map((club) => (
                                        <SelectItem
                                            key={club.id}
                                            value={club.id.toString()}
                                        >
                                            {club.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="player">Available Player</Label>
                            <Select
                                value={data.player_id}
                                onValueChange={(val) =>
                                    setData('player_id', val)
                                }
                                disabled={
                                    !selectedClubId ||
                                    availablePlayers.length === 0
                                }
                            >
                                <SelectTrigger id="player">
                                    <SelectValue
                                        placeholder={
                                            !selectedClubId
                                                ? 'Select a club first'
                                                : availablePlayers.length === 0
                                                  ? 'No available players in this club'
                                                  : 'Select a player...'
                                        }
                                    />
                                </SelectTrigger>
                                <SelectContent>
                                    {availablePlayers.map((player) => (
                                        <SelectItem
                                            key={player.id}
                                            value={player.id.toString()}
                                        >
                                            {player.name} (
                                            {player.role === 'player'
                                                ? `#${player.jersey_number}`
                                                : playerRoleLabel(player.role)}
                                            )
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {errors.player_id && (
                                <p className="text-sm font-medium text-destructive">
                                    {errors.player_id}
                                </p>
                            )}
                        </div>
                    </div>

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setOpen(false)}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            disabled={processing || !data.player_id}
                        >
                            <UserCheck className="mr-2 h-4 w-4" />
                            Add to Team
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
