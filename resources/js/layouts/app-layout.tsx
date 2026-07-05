import { usePage } from '@inertiajs/react';
import { useEffect } from 'react';
import { toast } from 'sonner';
import { Toaster } from '@/components/ui/sonner';
import AppLayoutTemplate from '@/layouts/app/app-sidebar-layout';
import type { BreadcrumbItem } from '@/types';

type FlashToast = {
    title: string;
    description?: string;
} | null;

export default function AppLayout({
    breadcrumbs = [],
    children,
}: {
    breadcrumbs?: BreadcrumbItem[];
    children: React.ReactNode;
}) {
    const { flash } = usePage<{ flash: { toast: FlashToast } }>().props;

    useEffect(() => {
        if (flash?.toast) {
            toast(flash.toast.title, {
                description: flash.toast.description,
            });
        }
    }, [flash]);

    return (
        <AppLayoutTemplate breadcrumbs={breadcrumbs}>
            {children}
        </AppLayoutTemplate>
    );
}
