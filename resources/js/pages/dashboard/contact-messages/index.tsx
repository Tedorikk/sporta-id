import { Head, router } from '@inertiajs/react';
import { Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { formatDate } from '@/lib/format-date';
import type { PaginatedContactMessages } from '@/types/contact-message';

interface Props {
    messages: PaginatedContactMessages;
}

export default function ContactMessagesIndex({ messages }: Props) {
    return (
        <>
            <Head title="Contact Messages" />
            <div className="flex h-full flex-1 flex-col gap-6 overflow-x-auto rounded-xl px-12 py-4">
                <div>
                    <h1 className="scroll-m-20 text-4xl font-bold tracking-tight text-balance">
                        Contact Messages
                    </h1>
                    <p className="mt-1 text-sm text-muted-foreground">
                        {messages.total === 0
                            ? 'No messages yet'
                            : `Showing ${messages.from}–${messages.to} of ${messages.total} messages`}
                    </p>
                </div>

                {messages.data.length === 0 ? (
                    <div className="flex flex-col items-center gap-2 py-16 text-muted-foreground">
                        <Mail className="size-10 opacity-40" />
                        <p>No contact form submissions yet.</p>
                    </div>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead>Email</TableHead>
                                <TableHead>Phone</TableHead>
                                <TableHead>Message</TableHead>
                                <TableHead>Received</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {messages.data.map((message) => (
                                <TableRow key={message.id}>
                                    <TableCell className="font-medium whitespace-nowrap">{message.name}</TableCell>
                                    <TableCell className="whitespace-nowrap">{message.email}</TableCell>
                                    <TableCell className="whitespace-nowrap">{message.phone ?? '—'}</TableCell>
                                    <TableCell className="max-w-md whitespace-normal">{message.message}</TableCell>
                                    <TableCell className="whitespace-nowrap">{formatDate(message.created_at)}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}

                {messages.last_page > 1 && (
                    <nav className="flex items-center justify-center gap-1 py-4">
                        {messages.links.map((link, i) => (
                            <Button
                                key={i}
                                variant={link.active ? 'default' : 'outline'}
                                size="sm"
                                disabled={!link.url}
                                onClick={() =>
                                    link.url &&
                                    router.visit(link.url, {
                                        preserveState: true,
                                        preserveScroll: true,
                                    })
                                }
                                dangerouslySetInnerHTML={{ __html: link.label }}
                            />
                        ))}
                    </nav>
                )}
            </div>
        </>
    );
}

ContactMessagesIndex.layout = {
    breadcrumbs: [
        {
            title: 'Contact Messages',
            href: '/dashboard/contact-messages',
        },
    ],
};
