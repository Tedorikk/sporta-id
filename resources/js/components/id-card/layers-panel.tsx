import { ArrowDown, ArrowUp, Copy, Eye, EyeOff, Image as ImageIcon, Lock, MoreVertical, QrCode, Square, Trash2, Type, Unlock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import type { CardElement, CardElementKind, CardSubjectType } from '@/types/card-template';
import { bindingLabel } from '@/types/card-template';

const KIND_ICON: Record<CardElementKind, typeof Type> = {
    text: Type,
    image: ImageIcon,
    qr: QrCode,
    shape: Square,
};

export function elementDisplayName(element: CardElement, subjectType: CardSubjectType): string {
    if (element.name) {
        return element.name;
    }

    if (element.binding) {
        return bindingLabel(subjectType, element.binding);
    }

    if (element.kind === 'text') {
        return element.staticText?.trim().split('\n')[0] || 'Text';
    }

    return element.kind === 'qr' ? 'QR code' : element.kind === 'image' ? 'Image' : 'Shape';
}

interface LayersPanelProps {
    elements: CardElement[];
    subjectType: CardSubjectType;
    selectedIds: string[];
    onSelect: (ids: string[]) => void;
    onToggle: (id: string, patch: Partial<CardElement>) => void;
    onReorder: (id: string, direction: 'up' | 'down' | 'front' | 'back') => void;
    onDuplicate: (ids: string[]) => void;
    onDelete: (ids: string[]) => void;
}

export function LayersPanel({
    elements,
    subjectType,
    selectedIds,
    onSelect,
    onToggle,
    onReorder,
    onDuplicate,
    onDelete,
}: LayersPanelProps) {
    // Topmost first, matching what the eye sees on the canvas.
    const ordered = [...elements].sort((a, b) => b.zIndex - a.zIndex);

    if (ordered.length === 0) {
        return (
            <p className="px-3 py-6 text-center text-xs text-muted-foreground">
                No layers yet. Add an element above to get started.
            </p>
        );
    }

    return (
        <ul className="flex flex-col gap-0.5 p-1.5">
            {ordered.map((element) => {
                const Icon = KIND_ICON[element.kind];
                const isSelected = selectedIds.includes(element.id);

                return (
                    <li key={element.id}>
                        <div
                            role="button"
                            tabIndex={0}
                            onClick={(e) => onSelect(e.shiftKey || e.metaKey || e.ctrlKey ? toggleId(selectedIds, element.id) : [element.id])}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault();
                                    onSelect([element.id]);
                                }
                            }}
                            className={cn(
                                'group flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors',
                                isSelected ? 'bg-primary/10 text-primary' : 'hover:bg-muted',
                                element.hidden && 'opacity-50',
                            )}
                        >
                            <Icon className="h-3.5 w-3.5 shrink-0 opacity-70" />

                            <span className="min-w-0 flex-1 truncate text-xs">{elementDisplayName(element, subjectType)}</span>

                            <button
                                type="button"
                                aria-label={element.hidden ? 'Show layer' : 'Hide layer'}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onToggle(element.id, { hidden: !element.hidden });
                                }}
                                className={cn(
                                    'rounded p-0.5 text-muted-foreground hover:text-foreground',
                                    !element.hidden && 'opacity-0 group-hover:opacity-100 focus-visible:opacity-100',
                                )}
                            >
                                {element.hidden ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                            </button>

                            <button
                                type="button"
                                aria-label={element.locked ? 'Unlock layer' : 'Lock layer'}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onToggle(element.id, { locked: !element.locked });
                                }}
                                className={cn(
                                    'rounded p-0.5 text-muted-foreground hover:text-foreground',
                                    !element.locked && 'opacity-0 group-hover:opacity-100 focus-visible:opacity-100',
                                )}
                            >
                                {element.locked ? <Lock className="h-3.5 w-3.5" /> : <Unlock className="h-3.5 w-3.5" />}
                            </button>

                            <DropdownMenu>
                                <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        aria-label="Layer actions"
                                        className="h-5 w-5 shrink-0 text-muted-foreground opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
                                    >
                                        <MoreVertical className="h-3.5 w-3.5" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-44">
                                    <DropdownMenuItem onClick={() => onReorder(element.id, 'front')}>
                                        <ArrowUp className="h-4 w-4" /> Bring to front
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => onReorder(element.id, 'up')}>
                                        <ArrowUp className="h-4 w-4" /> Bring forward
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => onReorder(element.id, 'down')}>
                                        <ArrowDown className="h-4 w-4" /> Send backward
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => onReorder(element.id, 'back')}>
                                        <ArrowDown className="h-4 w-4" /> Send to back
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={() => onDuplicate([element.id])}>
                                        <Copy className="h-4 w-4" /> Duplicate
                                    </DropdownMenuItem>
                                    <DropdownMenuItem variant="destructive" onClick={() => onDelete([element.id])}>
                                        <Trash2 className="h-4 w-4" /> Delete
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    </li>
                );
            })}
        </ul>
    );
}

function toggleId(ids: string[], id: string): string[] {
    return ids.includes(id) ? ids.filter((existing) => existing !== id) : [...ids, id];
}
