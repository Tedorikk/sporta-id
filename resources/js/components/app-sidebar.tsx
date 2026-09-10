import { Link, router } from '@inertiajs/react';
import { useEffect } from 'react';
import AppLogo from '@/components/app-logo';
import { NavFooter } from '@/components/nav-footer';
import { NavMain } from '@/components/nav-main';
import { NavUser } from '@/components/nav-user';
import { OrganizationSwitcher } from '@/components/organization-switcher';
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    useSidebar,
} from '@/components/ui/sidebar';
import { footerNavItems, mainNavItems } from '@/lib/nav-items';
import { dashboard } from '@/routes';

export function AppSidebar() {
    const { isMobile, setOpenMobile } = useSidebar();

    /**
     * On a phone the sidebar is a Sheet over the page, so following a link
     * leaves the drawer covering the page you just asked for. Closing on the
     * Inertia visit rather than on each link keeps every entry point — nav,
     * footer, organization switcher, user menu — behaving the same, including
     * ones added later. Desktop is unaffected: it reads `open`, not
     * `openMobile`, and the Sheet only renders below the mobile breakpoint.
     */
    useEffect(
        () => router.on('navigate', () => setOpenMobile(false)),
        [setOpenMobile],
    );

    /**
     * Widening past the breakpoint unmounts the Sheet without clearing its
     * state, so a phone rotated to landscape and back would find the drawer
     * open again. Landscape on a 375x812 phone is 812px wide, so this is a
     * rotation away, not a hypothetical.
     */
    useEffect(() => {
        if (!isMobile) {
            setOpenMobile(false);
        }
    }, [isMobile, setOpenMobile]);

    return (
        <Sidebar collapsible="icon" variant="inset">
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild>
                            <Link href={dashboard()} prefetch>
                                <AppLogo />
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
                <OrganizationSwitcher />
            </SidebarHeader>

            <SidebarContent>
                {/* Below md this sidebar is the drawer, and the primary
                    destinations are already in the bottom tab bar — listing
                    them twice is the duplication Material warns against. From
                    md up the drawer is gone and this is the only navigation,
                    so it has to be here. CSS rather than `isMobile` keeps the
                    server render and first paint identical. */}
                <div className="hidden md:block">
                    <NavMain items={mainNavItems} />
                </div>
            </SidebarContent>

            <SidebarFooter>
                <NavFooter items={footerNavItems} className="mt-auto" />
                <NavUser />
            </SidebarFooter>
        </Sidebar>
    );
}
