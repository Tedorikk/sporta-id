import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
    currentPage: number;
    lastPage: number;
    from: number | null;
    to: number | null;
    total: number;
    onNavigate: (page: number) => void;
}

/**
 * Collapses a long page list to first, last and a window around the current page.
 */
function pageWindow(current: number, last: number): (number | 'gap')[] {
    if (last <= 7) {
        return Array.from({ length: last }, (_, index) => index + 1);
    }

    const wanted = new Set([1, last, current - 1, current, current + 1]);

    // Keep the window a consistent width when the current page is near an end,
    // so the control does not visibly shrink as you page through.
    if (current <= 3) {
        [2, 3, 4].forEach((page) => wanted.add(page));
    }

    if (current >= last - 2) {
        [last - 3, last - 2, last - 1].forEach((page) => wanted.add(page));
    }

    const pages = [...wanted]
        .filter((page) => page >= 1 && page <= last)
        .sort((a, b) => a - b);

    const withGaps: (number | 'gap')[] = [];
    let previous = 0;

    for (const page of pages) {
        if (page - previous > 1) {
            withGaps.push('gap');
        }

        withGaps.push(page);
        previous = page;
    }

    return withGaps;
}

export function EventsPagination({
    currentPage,
    lastPage,
    from,
    to,
    total,
    onNavigate,
}: Props) {
    const pages = pageWindow(currentPage, lastPage);

    return (
        <nav
            aria-label="Pagination"
            className="flex flex-wrap items-center justify-between gap-3 py-2"
        >
            <p className="text-sm text-muted-foreground">
                Showing {from}–{to} of {total}
            </p>

            <div className="flex items-center gap-1">
                <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage <= 1}
                    onClick={() => onNavigate(currentPage - 1)}
                >
                    <ChevronLeft className="mr-1 size-4" />
                    Previous
                </Button>

                {pages.map((page, index) =>
                    page === 'gap' ? (
                        <span
                            key={`gap-${index}`}
                            aria-hidden="true"
                            className="px-1 text-muted-foreground"
                        >
                            …
                        </span>
                    ) : (
                        <Button
                            key={page}
                            variant={page === currentPage ? 'default' : 'ghost'}
                            size="sm"
                            className="min-w-9 tabular-nums"
                            aria-current={
                                page === currentPage ? 'page' : undefined
                            }
                            aria-label={`Page ${page}`}
                            onClick={() => onNavigate(page)}
                        >
                            {page}
                        </Button>
                    ),
                )}

                <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage >= lastPage}
                    onClick={() => onNavigate(currentPage + 1)}
                >
                    Next
                    <ChevronRight className="ml-1 size-4" />
                </Button>
            </div>
        </nav>
    );
}
