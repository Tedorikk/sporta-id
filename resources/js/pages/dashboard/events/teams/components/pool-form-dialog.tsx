import { useState } from 'react';
import { useForm } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, LayoutGrid, Layers } from 'lucide-react';

type NumberingStyle = 'numeric' | 'alpha' | 'roman';

const NUMBERING_STYLES: { value: NumberingStyle; label: string; sample: string }[] = [
    { value: 'numeric', label: 'Numbers', sample: '1, 2, 3, 4' },
    { value: 'alpha', label: 'Letters', sample: 'A, B, C, D' },
    { value: 'roman', label: 'Roman numerals', sample: 'I, II, III, IV' },
];

// Preview-only helpers — the real names are generated server-side.
function toAlpha(n: number): string {
    let label = '';
    while (n > 0) {
        const rem = (n - 1) % 26;
        label = String.fromCharCode(65 + rem) + label;
        n = Math.floor((n - 1) / 26);
    }
    return label;
}

function toRoman(n: number): string {
    const table: [number, string][] = [
        [1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'],
        [100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'],
        [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I'],
    ];
    let result = '';
    for (const [value, symbol] of table) {
        while (n >= value) {
            result += symbol;
            n -= value;
        }
    }
    return result;
}

function label(style: NumberingStyle, n: number): string {
    if (style === 'alpha') return toAlpha(n);
    if (style === 'roman') return toRoman(n);
    return String(n);
}

export function PoolFormDialog({ event, trigger }: { event: any; trigger: React.ReactNode }) {
    const [mode, setMode] = useState<'single' | 'bulk'>('single');
    const { data, setData, post, processing } = useForm({
        name: '',
        prefix: 'Group',
        number_of_pools: 2,
        teams_per_pool: 4,
        numbering_style: 'numeric' as NumberingStyle,
    });

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        const url = mode === 'bulk'
            ? `/dashboard/events/${event.id}/pools/auto-assign`
            : `/dashboard/events/${event.id}/pools`;

        post(url, { preserveScroll: true });
    };

    const previewNames = Array.from(
        { length: Math.min(data.number_of_pools || 0, 4) },
        (_, i) => `${data.prefix} ${label(data.numbering_style, i + 1)}`,
    );

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
                                    <Input type="number" min={1} max={10} value={data.number_of_pools} onChange={e => setData('number_of_pools', Number(e.target.value))} />
                                </div>
                            </div>

                            <div>
                                <Label>Numbering Style</Label>
                                <Select
                                    value={data.numbering_style}
                                    onValueChange={(v) => setData('numbering_style', v as NumberingStyle)}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {NUMBERING_STYLES.map((style) => (
                                            <SelectItem key={style.value} value={style.value}>
                                                {style.label}
                                                <span className="ml-2 text-muted-foreground">
                                                    ({style.sample})
                                                </span>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div>
                                <Label>Teams per Pool</Label>
                                <Input type="number" min={1} value={data.teams_per_pool} onChange={e => setData('teams_per_pool', Number(e.target.value))} />
                            </div>

                            {previewNames.length > 0 && (
                                <p className="text-xs text-muted-foreground">
                                    Preview: {previewNames.join(', ')}
                                    {data.number_of_pools > 4 ? ', …' : ''} —
                                    each attempting to fill {data.teams_per_pool} team
                                    {data.teams_per_pool === 1 ? '' : 's'}.
                                </p>
                            )}
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