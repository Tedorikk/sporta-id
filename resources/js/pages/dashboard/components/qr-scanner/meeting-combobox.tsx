import axios from 'axios';
import { Check, ChevronsUpDown, Search } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { LocalTime } from '@/components/local-time';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';

import { cn } from '@/lib/utils';
import type { Meeting } from '@/types/meeting';

interface MeetingComboboxProps {
    /** Default/recent meetings shown when the search box is empty. */
    meetings: Meeting[];
    value: Meeting | null;
    onChange: (meeting: Meeting | null) => void;
}

/**
 * Searchable meeting picker. Built from Popover + Input + a manual filtered
 * list rather than a plain <Select> — with hundreds/thousands of meetings a
 * native select's long scroll (with no way to type-to-find) stops being usable.
 * Falls back to a debounced server search (MeetingController::search) for
 * anything outside the initial `meetings` list.
 */
export function MeetingCombobox({
    meetings,
    value,
    onChange,
}: MeetingComboboxProps) {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');
    // Only ever populated by a completed server search; when `query` is empty
    // the `meetings` prop is shown directly (see `visibleResults` below), so
    // there's no need to mirror it into state on every prop change.
    const [searchResults, setSearchResults] = useState<Meeting[]>([]);
    const [loading, setLoading] = useState(false);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        if (debounceRef.current) {
            clearTimeout(debounceRef.current);
        }

        if (!query) {
            return;
        }

        debounceRef.current = setTimeout(() => {
            setLoading(true);

            axios
                .get<Meeting[]>('/dashboard/meetings/search', {
                    params: { q: query },
                })
                .then(({ data }) => setSearchResults(data))
                .finally(() => setLoading(false));
        }, 300);

        return () => {
            if (debounceRef.current) {
                clearTimeout(debounceRef.current);
            }
        };
    }, [query]);

    const visibleResults = query ? searchResults : meetings;
    // A stale in-flight request's `finally` will still flip `loading` back off;
    // this just also stops showing "Searching…" the instant the query is cleared.
    const isSearching = loading && query.length > 0;

    function select(meeting: Meeting | null) {
        onChange(meeting);
        setOpen(false);
        setQuery('');
    }

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className="w-64 justify-between font-normal"
                >
                    <span className="truncate">
                        {value ? value.title : 'No meeting selected'}
                    </span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0" align="end">
                <div className="flex items-center gap-2 border-b p-2">
                    <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <Input
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Search meetings..."
                        className="h-8 border-0 shadow-none focus-visible:ring-0"
                        autoFocus
                    />
                </div>

                <div className="max-h-72 overflow-y-auto p-1">
                    <button
                        type="button"
                        onClick={() => select(null)}
                        className={cn(
                            'flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm hover:bg-muted',
                            !value && 'font-medium',
                        )}
                    >
                        <Check
                            className={cn(
                                'h-4 w-4 shrink-0',
                                value ? 'opacity-0' : 'opacity-100',
                            )}
                        />
                        No meeting (lookup only)
                    </button>

                    {isSearching && (
                        <p className="px-2 py-3 text-center text-xs text-muted-foreground">
                            Searching…
                        </p>
                    )}

                    {!isSearching && visibleResults.length === 0 && (
                        <p className="px-2 py-3 text-center text-xs text-muted-foreground">
                            No meetings found.
                        </p>
                    )}

                    {!isSearching &&
                        visibleResults.map((meeting) => (
                            <button
                                key={meeting.id}
                                type="button"
                                onClick={() => select(meeting)}
                                className={cn(
                                    'flex w-full items-start gap-2 rounded-md px-2 py-2 text-left text-sm hover:bg-muted',
                                    value?.id === meeting.id && 'font-medium',
                                )}
                            >
                                <Check
                                    className={cn(
                                        'mt-0.5 h-4 w-4 shrink-0',
                                        value?.id === meeting.id
                                            ? 'opacity-100'
                                            : 'opacity-0',
                                    )}
                                />
                                <span className="flex min-w-0 flex-col">
                                    <span className="truncate">
                                        {meeting.title}
                                    </span>
                                    <span className="truncate text-xs text-muted-foreground">
                                        {meeting.event?.name} ·{' '}
                                        <LocalTime
                                            value={meeting.scheduled_at}
                                        />
                                    </span>
                                </span>
                            </button>
                        ))}
                </div>
            </PopoverContent>
        </Popover>
    );
}
