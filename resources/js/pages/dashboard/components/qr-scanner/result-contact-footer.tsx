import { Mail, Phone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ResultContactFooterProps {
    email?: string | null;
    phone?: string | null;
    onScanAnother: () => void;
    className?: string;
}

/** Shared "contact info + Scan another" bar used by attendee/registration result cards. */
export function ResultContactFooter({ email, phone, onScanAnother, className }: ResultContactFooterProps) {
    return (
        <div className={cn('flex flex-wrap items-center gap-3 rounded-lg bg-slate-50 p-4 dark:bg-slate-900/40', className)}>
            {email && (
                <span className="flex items-center gap-2 text-base text-muted-foreground">
                    <Mail className="h-5 w-5 shrink-0" />
                    {email}
                </span>
            )}
            {phone && (
                <span className="flex items-center gap-2 text-base text-muted-foreground">
                    <Phone className="h-5 w-5 shrink-0" />
                    {phone}
                </span>
            )}
            <Button size="sm" variant="outline" className="ml-auto text-sm" onClick={onScanAnother}>
                Scan another
            </Button>
        </div>
    );
}
