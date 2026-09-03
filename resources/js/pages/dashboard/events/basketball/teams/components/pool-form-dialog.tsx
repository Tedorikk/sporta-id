import { useForm } from '@inertiajs/react';
import { Loader2, LayoutGrid, Layers, Info } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { BasketballEventCategory } from '@/types/basketball-event-category';
import type { Event } from '@/types/event';
import type { Team } from '@/types/team';

type NumberingStyle = 'numeric' | 'alpha' | 'roman';

const NUMBERING_STYLES: {
    value: NumberingStyle;
    label: string;
    sample: string;
}[] = [
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
        [1000, 'M'],
        [900, 'CM'],
        [500, 'D'],
        [400, 'CD'],
        [100, 'C'],
        [90, 'XC'],
        [50, 'L'],
        [40, 'XL'],
        [10, 'X'],
        [9, 'IX'],
        [5, 'V'],
        [4, 'IV'],
        [1, 'I'],
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
    if (style === 'alpha') {
        return toAlpha(n);
    }

    if (style === 'roman') {
        return toRoman(n);
    }

    return String(n);
}

type PoolFormDialogProps = {
    event: Event;
    category: BasketballEventCategory;
    teams: Team[];
    existingPoolCount?: number;
    trigger: React.ReactNode;
};

export function PoolFormDialog({
    event,
    category,
    teams,
    existingPoolCount = 0,
    trigger,
}: PoolFormDialogProps) {
    const [open, setOpen] = useState(false);
    const [mode, setMode] = useState<'single' | 'bulk'>('single');

    const { data, setData, post, processing, errors, reset } = useForm({
        name: '',
        prefix: 'Group',
        number_of_pools: 2,
        teams_per_pool: 4,
        numbering_style: 'numeric' as NumberingStyle,
    });

    const basePath = `/dashboard/events/${event.id}/basketball-categories/${category.id}/pools`;
    const isRoundRobin = category.format === 'round_robin';
    const teamCount = teams.length;
    const capacity = data.number_of_pools * data.teams_per_pool;
    const overCapacity = mode === 'bulk' && capacity < teamCount;

    const previewNames = useMemo(
        () =>
            Array.from(
                { length: Math.min(data.number_of_pools || 0, 4) },
                (_, i) =>
                    `${data.prefix} ${label(data.numbering_style, i + 1)}`,
            ),
        [data.prefix, data.number_of_pools, data.numbering_style],
    );

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        const url = mode === 'bulk' ? `${basePath}/auto-assign` : basePath;

        post(url, {
            preserveScroll: true,
            onSuccess: () => {
                setOpen(false);
                reset();
            },
        });
    };

    // Round-robin categories don't use pools at all — matches are generated
    // directly from the full team list. Explain that instead of showing a
    // form that would create pools nothing will ever read.
    if (isRoundRobin) {
        return (
            <Dialog open={open} onOpenChange={setOpen}>
                <DialogTrigger asChild>{trigger}</DialogTrigger>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>
                            Pools not used for this category
                        </DialogTitle>
                        <DialogDescription className="flex items-start gap-2 pt-2">
                            <Info className="mt-0.5 h-4 w-4 shrink-0" />
                            <span>
                                "{category.name}" is set to round robin format,
                                so every team plays every other team directly.
                                Head to the Matches tab to generate the schedule
                                instead.
                            </span>
                        </DialogDescription>
                    </DialogHeader>
                </DialogContent>
            </Dialog>
        );
    }

    if (teamCount === 0) {
        return (
            <Dialog open={open} onOpenChange={setOpen}>
                <DialogTrigger asChild>{trigger}</DialogTrigger>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>No teams yet</DialogTitle>
                        <DialogDescription className="flex items-start gap-2 pt-2">
                            <Info className="mt-0.5 h-4 w-4 shrink-0" />
                            <span>
                                Register at least one team in "{category.name}"
                                before creating pools.
                            </span>
                        </DialogDescription>
                    </DialogHeader>
                </DialogContent>
            </Dialog>
        );
    }

    return (
        <Dialog
            open={open}
            onOpenChange={(next) => {
                setOpen(next);

                if (!next) {
                    reset();
                }
            }}
        >
            <DialogTrigger asChild>{trigger}</DialogTrigger>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Manage pools</DialogTitle>
                    <DialogDescription>
                        {category.name} — {teamCount} team
                        {teamCount === 1 ? '' : 's'} registered
                        {existingPoolCount > 0 &&
                            `, ${existingPoolCount} pool${existingPoolCount === 1 ? '' : 's'} already created`}
                        .
                    </DialogDescription>
                </DialogHeader>

                <Tabs
                    value={mode}
                    onValueChange={(v) => setMode(v as 'single' | 'bulk')}
                    className="w-full"
                >
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="single">
                            <LayoutGrid className="mr-2 h-4 w-4" />
                            Single
                        </TabsTrigger>
                        <TabsTrigger value="bulk">
                            <Layers className="mr-2 h-4 w-4" />
                            Bulk generate
                        </TabsTrigger>
                    </TabsList>

                    <form onSubmit={submit} className="space-y-4 pt-4">
                        <TabsContent value="single" className="space-y-4">
                            <div>
                                <Label htmlFor="pool_name">Pool name</Label>
                                <Input
                                    id="pool_name"
                                    value={data.name}
                                    onChange={(e) =>
                                        setData('name', e.target.value)
                                    }
                                    required
                                    placeholder="e.g., Final Round"
                                    aria-invalid={Boolean(errors.name)}
                                />
                                {errors.name && (
                                    <p className="mt-1 text-sm text-destructive">
                                        {errors.name}
                                    </p>
                                )}
                            </div>
                        </TabsContent>

                        <TabsContent value="bulk" className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label htmlFor="prefix">Name prefix</Label>
                                    <Input
                                        id="prefix"
                                        value={data.prefix}
                                        onChange={(e) =>
                                            setData('prefix', e.target.value)
                                        }
                                        placeholder="Group"
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="number_of_pools">
                                        Number of pools
                                    </Label>
                                    <Input
                                        id="number_of_pools"
                                        type="number"
                                        min={1}
                                        max={10}
                                        value={data.number_of_pools}
                                        onChange={(e) =>
                                            setData(
                                                'number_of_pools',
                                                Number(e.target.value),
                                            )
                                        }
                                        aria-invalid={Boolean(
                                            errors.number_of_pools,
                                        )}
                                    />
                                </div>
                            </div>

                            <div>
                                <Label htmlFor="numbering_style">
                                    Numbering style
                                </Label>
                                <Select
                                    value={data.numbering_style}
                                    onValueChange={(v) =>
                                        setData(
                                            'numbering_style',
                                            v as NumberingStyle,
                                        )
                                    }
                                >
                                    <SelectTrigger id="numbering_style">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {NUMBERING_STYLES.map((style) => (
                                            <SelectItem
                                                key={style.value}
                                                value={style.value}
                                            >
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
                                <Label htmlFor="teams_per_pool">
                                    Teams per pool
                                </Label>
                                <Input
                                    id="teams_per_pool"
                                    type="number"
                                    min={1}
                                    value={data.teams_per_pool}
                                    onChange={(e) =>
                                        setData(
                                            'teams_per_pool',
                                            Number(e.target.value),
                                        )
                                    }
                                    aria-invalid={Boolean(
                                        errors.teams_per_pool,
                                    )}
                                />
                            </div>

                            {previewNames.length > 0 && (
                                <p className="text-xs text-muted-foreground">
                                    Preview: {previewNames.join(', ')}
                                    {data.number_of_pools > 4 ? ', …' : ''} —
                                    capacity for {capacity} of {teamCount} team
                                    {teamCount === 1 ? '' : 's'}.
                                </p>
                            )}

                            {overCapacity && (
                                <p className="flex items-start gap-2 text-xs text-destructive">
                                    <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                                    {teamCount - capacity} team
                                    {teamCount - capacity === 1 ? '' : 's'}{' '}
                                    won't fit — increase the number of pools or
                                    teams per pool.
                                </p>
                            )}

                            {existingPoolCount > 0 && (
                                <p className="flex items-start gap-2 text-xs text-muted-foreground">
                                    <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                                    This category already has{' '}
                                    {existingPoolCount} pool
                                    {existingPoolCount === 1 ? '' : 's'}.
                                    Generating again will add to them, not
                                    replace them.
                                </p>
                            )}
                        </TabsContent>

                        <Button
                            type="submit"
                            className="w-full"
                            disabled={
                                processing || (mode === 'bulk' && overCapacity)
                            }
                        >
                            {processing && (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            )}
                            {processing ? 'Saving...' : 'Confirm & create'}
                        </Button>
                    </form>
                </Tabs>
            </DialogContent>
        </Dialog>
    );
}
