import { Settings2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuCheckboxItem,
    DropdownMenuContent,
    DropdownMenuLabel,
    DropdownMenuRadioGroup,
    DropdownMenuRadioItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export type TableDensity = 'comfortable' | 'compact';

export type EventColumnKey =
    | 'category'
    | 'start_date'
    | 'end_date'
    | 'timing'
    | 'publication'
    | 'attendees';

/** Order here is the order the columns appear in, after the fixed name column. */
export const EVENT_COLUMNS: { key: EventColumnKey; label: string }[] = [
    { key: 'category', label: 'Category' },
    { key: 'start_date', label: 'Starts' },
    { key: 'end_date', label: 'Ends' },
    { key: 'timing', label: 'Timing' },
    { key: 'publication', label: 'Published' },
    { key: 'attendees', label: 'Attendees' },
];

export interface EventTablePreferences {
    density: TableDensity;
    hiddenColumns: EventColumnKey[];
}

export const DEFAULT_TABLE_PREFERENCES: EventTablePreferences = {
    density: 'comfortable',
    hiddenColumns: [],
};

interface Props {
    preferences: EventTablePreferences;
    onChange: (partial: Partial<EventTablePreferences>) => void;
}

export function EventTableOptions({ preferences, onChange }: Props) {
    function toggleColumn(key: EventColumnKey, visible: boolean) {
        onChange({
            hiddenColumns: visible
                ? preferences.hiddenColumns.filter((column) => column !== key)
                : [...preferences.hiddenColumns, key],
        });
    }

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1.5">
                    <Settings2 className="size-4" />
                    View options
                </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuLabel>Row height</DropdownMenuLabel>
                <DropdownMenuRadioGroup
                    value={preferences.density}
                    onValueChange={(density) =>
                        onChange({ density: density as TableDensity })
                    }
                >
                    <DropdownMenuRadioItem value="comfortable">
                        Comfortable
                    </DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="compact">
                        Compact
                    </DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>

                <DropdownMenuSeparator />

                <DropdownMenuLabel>Columns</DropdownMenuLabel>
                {EVENT_COLUMNS.map(({ key, label }) => (
                    <DropdownMenuCheckboxItem
                        key={key}
                        checked={!preferences.hiddenColumns.includes(key)}
                        // Radix closes on select by default; keeping it open lets
                        // several columns be toggled in one visit to the menu.
                        onSelect={(event) => event.preventDefault()}
                        onCheckedChange={(checked) =>
                            toggleColumn(key, checked)
                        }
                    >
                        {label}
                    </DropdownMenuCheckboxItem>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
