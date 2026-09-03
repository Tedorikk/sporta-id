import { AlertCircle, AlertTriangle, CheckCircle2, Info } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { ReviewIssue, ReviewSummary } from '@/types/team';

const SEVERITY_TEXT: Record<ReviewIssue['severity'], string> = {
    error: 'text-red-500',
    warning: 'text-amber-500',
    info: 'text-sky-500',
};

const SEVERITY_ICON: Record<ReviewIssue['severity'], typeof AlertCircle> = {
    error: AlertCircle,
    warning: AlertTriangle,
    info: Info,
};

export function IssueSummaryBadge({ summary }: { summary: ReviewSummary }) {
    if (summary.total === 0) {
        return (
            <Badge variant="outline" className="gap-1 text-muted-foreground">
                <CheckCircle2 className="h-3 w-3" />
                No issues
            </Badge>
        );
    }

    if (summary.errors > 0) {
        return (
            <Badge variant="destructive" className="gap-1">
                <AlertCircle className="h-3 w-3" />
                {summary.errors} error{summary.errors === 1 ? '' : 's'}
                {summary.warnings > 0
                    ? `, ${summary.warnings} warning${summary.warnings === 1 ? '' : 's'}`
                    : ''}
            </Badge>
        );
    }

    return (
        <Badge className="gap-1 border-transparent bg-amber-500 text-white hover:bg-amber-600">
            <AlertTriangle className="h-3 w-3" />
            {summary.total} issue{summary.total === 1 ? '' : 's'}
        </Badge>
    );
}

export function IssueList({ issues }: { issues: ReviewIssue[] }) {
    if (issues.length === 0) {
        return (
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <CheckCircle2 className="h-3.5 w-3.5" />
                No issues found.
            </p>
        );
    }

    return (
        <ul className="flex flex-col gap-1.5">
            {issues.map((issue, i) => {
                const Icon = SEVERITY_ICON[issue.severity];

                return (
                    <li
                        key={`${issue.code}-${i}`}
                        className="flex items-start gap-1.5 text-xs"
                    >
                        <Icon
                            className={cn(
                                'mt-0.5 h-3.5 w-3.5 shrink-0',
                                SEVERITY_TEXT[issue.severity],
                            )}
                        />
                        <span className="text-muted-foreground">
                            {issue.message}
                        </span>
                    </li>
                );
            })}
        </ul>
    );
}
