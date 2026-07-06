import { useState } from 'react';
import { useForm } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, LayoutGrid, Layers } from 'lucide-react';

export function PoolFormDialog({ event, trigger }: { event: any; trigger: React.ReactNode }) {
    const [mode, setMode] = useState<'single' | 'bulk'>('single');
    const { data, setData, post, processing } = useForm({
        name: '',
        prefix: 'Group',
        number_of_pools: 2,
        teams_per_pool: 4,
    });

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        const url = mode === 'bulk'
            ? `/dashboard/events/${event.id}/pools/auto-assign`
            : `/dashboard/events/${event.id}/pools`;

        post(url, { preserveScroll: true });
    };

    return (
        <Dialog>
            <DialogTrigger asChild>{trigger}</DialogTrigger>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Manage Pools</DialogTitle>
                </DialogHeader>

                <Tabs value={mode} onValueChange={(v) => setMode(v as any)} className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="single"><LayoutGrid className="mr-2 h-4 w-4" />Single</TabsTrigger>
                        <TabsTrigger value="bulk"><Layers className="mr-2 h-4 w-4" />Bulk Generate</TabsTrigger>
                    </TabsList>

                    <form onSubmit={submit} className="space-y-4 pt-4">
                        <TabsContent value="single" className="space-y-4">
                            <div>
                                <Label>Pool Name</Label>
                                <Input value={data.name} onChange={e => setData('name', e.target.value)} required placeholder="e.g., Final Round" />
                            </div>
                        </TabsContent>

                        <TabsContent value="bulk" className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label>Name Prefix</Label>
                                    <Input value={data.prefix} onChange={e => setData('prefix', e.target.value)} placeholder="Group" />
                                </div>
                                <div>
                                    <Label>Number of Pools</Label>
                                    <Input type="number" min={1} value={data.number_of_pools} onChange={e => setData('number_of_pools', Number(e.target.value))} />
                                </div>
                            </div>
                            <div>
                                <Label>Teams per Pool</Label>
                                <Input type="number" min={1} value={data.teams_per_pool} onChange={e => setData('teams_per_pool', Number(e.target.value))} />
                                <p className="text-xs text-muted-foreground mt-2">
                                    This will create {data.number_of_pools} pools, each attempting to fill {data.teams_per_pool} teams.
                                </p>
                            </div>
                        </TabsContent>

                        <Button type="submit" className="w-full" disabled={processing}>
                            {processing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Confirm & Create'}
                        </Button>
                    </form>
                </Tabs>
            </DialogContent>
        </Dialog>
    );
}