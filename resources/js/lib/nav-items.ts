import {
    BookOpen,
    CalendarDays,
    FolderGit2,
    LayoutGrid,
    Mail,
    QrCode,
} from 'lucide-react';
import { dashboard } from '@/routes';
import type { NavItem } from '@/types';

/**
 * The primary destinations, shared by the sidebar and the mobile tab bar so
 * the two can't drift apart. Keep this at four or fewer: past that the tab bar
 * stops having room for readable labels and comfortable targets, and the
 * argument for showing them all rather than hiding them weakens.
 */
export const mainNavItems: NavItem[] = [
    {
        title: 'Dashboard',
        href: dashboard(),
        icon: LayoutGrid,
    },
    {
        title: 'Events',
        href: '/dashboard/events',
        icon: CalendarDays,
    },
    {
        title: 'QR Scanner',
        shortTitle: 'Scan',
        href: '/dashboard/qr-scanner',
        icon: QrCode,
    },
    {
        title: 'Contact Messages',
        shortTitle: 'Messages',
        href: '/dashboard/contact-messages',
        icon: Mail,
    },
];

/** Secondary, external links — sidebar only. */
export const footerNavItems: NavItem[] = [
    {
        title: 'Repository',
        href: 'https://github.com/laravel/react-starter-kit',
        icon: FolderGit2,
    },
    {
        title: 'Documentation',
        href: 'https://laravel.com/docs/starter-kits#react',
        icon: BookOpen,
    },
];
