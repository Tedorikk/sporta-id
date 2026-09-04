import type { LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

/**
 * The square icon button used across the ID card tooling — the designer's
 * canvas toolbar and the print sheet's toolbar — so both read as one feature.
 * `active` marks a toggle that's currently on.
 */
export function ToolbarIcon({
    label,
    icon: Icon,
    onClick,
    disabled,
    active,
}: {
    label: string;
    icon: LucideIcon;
    onClick: () => void;
    disabled?: boolean;
    active?: boolean;
}) {
    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <Button
                    variant="ghost"
                    size="icon"
                    aria-label={label}
                    aria-pressed={active}
                    disabled={disabled}
                    onClick={onClick}
                    className={cn(
                        'h-8 w-8',
                        active && 'bg-primary/10 text-primary',
                    )}
                >
                    <Icon className="h-4 w-4" />
                </Button>
            </TooltipTrigger>
            <TooltipContent>{label}</TooltipContent>
        </Tooltip>
    );
}
