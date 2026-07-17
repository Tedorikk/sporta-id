import { useForm, router } from '@inertiajs/react';
import { LayoutGrid, Plus, Trash2, X } from 'lucide-react';
import type { FormEventHandler } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { Event } from '@/types/event';

// Assuming you have these types defined based on your models
interface Team {
    id: number;
    name: string;
}

interface Pool {
    id: number;
    name: string;
    teams: Team[];
}

interface Props {
    event: Event;
    pools: Pool[];
    teams: Team[];
}

export default function PoolIndex({ event, pools, teams }: Props) {
    const { data, setData, post, processing, reset, errors } = useForm({
        name: '',
    });

    const handleCreatePool: FormEventHandler = (e) => {
        e.preventDefault();
        post(`/dashboard/events/${event.id}/pools`, {
            onSuccess: () => reset('name'),
            preserveScroll: true,
        });
    };

    const handleDeletePool = (poolId: number) => {
        if (confirm('Are you sure you want to delete this pool?')) {
            router.delete(`/dashboard/events/${event.id}/pools/${poolId}`, {
                preserveScroll: true,
            });
        }
    };

    const handleAssignTeam = (poolId: number, teamId: string) => {
        if (!teamId) {
return;
}

        router.post(
            `/dashboard/events/${event.id}/pools/${poolId}/teams`,
            { team_id: teamId },
            { preserveScroll: true }
        );
    };

    const handleRemoveTeam = (poolId: number, teamId: number) => {
        router.delete(`/dashboard/events/${event.id}/pools/${poolId}/teams/${teamId}`, {
            preserveScroll: true,
        });
    };

    return (
        <div className="mx-auto max-w-6xl p-6 space-y-8">
            <header>
                <h1 className="text-3xl font-bold tracking-tight">Pool Management</h1>
                <p className="text-muted-foreground">{event.name}</p>
            </header>

            {/* Create Pool Form */}
            <section className="bg-card border rounded-xl p-6 shadow-sm">
                <form onSubmit={handleCreatePool} className="flex items-end gap-4">
                    <div className="flex-1 max-w-sm space-y-2">
                        <Label htmlFor="name">Create New Pool</Label>
                        <Input
                            id="name"
                            placeholder="e.g., Group A"
                            value={data.name}
                            onChange={(e) => setData('name', e.target.value)}
                            disabled={processing}
                        />
                        {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
                    </div>
                    <Button type="submit" disabled={processing || !data.name}>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Pool
                    </Button>
                </form>
            </section>

            {/* Pools Grid */}
            <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {pools.length === 0 ? (
                    <div className="col-span-full py-12 text-center border border-dashed rounded-xl text-muted-foreground">
                        <LayoutGrid className="mx-auto h-8 w-8 mb-3 opacity-50" />
                        <p>No pools created yet.</p>
                    </div>
                ) : (
                    pools.map((pool) => {
                        // Filter out teams that are already in THIS pool to populate the dropdown
                        const availableTeams = teams.filter(
                            (t) => !pool.teams.some((pt) => pt.id === t.id)
                        );

                        return (
                            <div key={pool.id} className="bg-card border rounded-xl shadow-sm overflow-hidden flex flex-col">
                                <div className="bg-muted/50 p-4 border-b flex justify-between items-center">
                                    <h3 className="font-semibold text-lg">{pool.name}</h3>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="text-destructive h-8 w-8"
                                        onClick={() => handleDeletePool(pool.id)}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>

                                <div className="p-4 flex-1 flex flex-col gap-4">
                                    {/* Team List inside Pool */}
                                    <ul className="space-y-2 flex-1">
                                        {pool.teams.length === 0 ? (
                                            <li className="text-sm text-muted-foreground italic text-center py-4">
                                                No teams assigned
                                            </li>
                                        ) : (
                                            pool.teams.map((team) => (
                                                <li key={team.id} className="flex justify-between items-center bg-background border rounded p-2 text-sm">
                                                    <span className="font-medium">{team.name}</span>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-6 w-6 text-muted-foreground hover:text-destructive"
                                                        onClick={() => handleRemoveTeam(pool.id, team.id)}
                                                    >
                                                        <X className="h-4 w-4" />
                                                    </Button>
                                                </li>
                                            ))
                                        )}
                                    </ul>

                                    {/* Assign Team Dropdown */}
                                    <div className="pt-2 border-t">
                                        <select
                                            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                            onChange={(e) => {
                                                handleAssignTeam(pool.id, e.target.value);
                                                e.target.value = ""; // Reset dropdown after selection
                                            }}
                                            defaultValue=""
                                        >
                                            <option value="" disabled>+ Assign a team...</option>
                                            {availableTeams.map((team) => (
                                                <option key={team.id} value={team.id}>
                                                    {team.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </section>
        </div>
    );
}