import { Link, router, usePage } from '@inertiajs/react';
import { Building2, Check, ChevronsUpDown, Plus, Users } from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    useSidebar,
} from '@/components/ui/sidebar';
import { useIsMobile } from '@/hooks/use-mobile';
import {
    index as organizationsIndex,
    switchMethod,
} from '@/routes/organizations';

export function OrganizationSwitcher() {
    const { auth } = usePage().props;
    const { state } = useSidebar();
    const isMobile = useIsMobile();

    const current = auth.organization;
    const organizations = auth.organizations ?? [];

    if (!auth.user) {
        return null;
    }

    return (
        <SidebarMenu>
            <SidebarMenuItem>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <SidebarMenuButton
                            size="lg"
                            className="data-[state=open]:bg-sidebar-accent"
                            data-test="organization-switcher"
                        >
                            <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                                <Building2 className="size-4" />
                            </div>
                            <div className="grid flex-1 text-left text-sm leading-tight">
                                <span className="truncate font-medium">
                                    {current?.name ?? 'No organization'}
                                </span>
                                <span className="truncate text-xs text-muted-foreground">
                                    {organizations.length === 1
                                        ? '1 organization'
                                        : `${organizations.length} organizations`}
                                </span>
                            </div>
                            <ChevronsUpDown className="ml-auto size-4" />
                        </SidebarMenuButton>
                    </DropdownMenuTrigger>

                    <DropdownMenuContent
                        className="w-(--radix-dropdown-menu-trigger-width) min-w-60 rounded-lg"
                        align="start"
                        side={
                            isMobile
                                ? 'bottom'
                                : state === 'collapsed'
                                  ? 'right'
                                  : 'bottom'
                        }
                    >
                        <DropdownMenuLabel className="text-xs text-muted-foreground">
                            Organizations
                        </DropdownMenuLabel>

                        {organizations.map((organization) => (
                            <DropdownMenuItem
                                key={organization.id}
                                onSelect={() => {
                                    if (organization.id === current?.id) {
                                        return;
                                    }

                                    router.put(
                                        switchMethod.url(organization.id),
                                    );
                                }}
                                className="gap-2"
                            >
                                <div className="flex size-6 items-center justify-center rounded-md border">
                                    <Building2 className="size-3.5 shrink-0" />
                                </div>
                                <span className="truncate">
                                    {organization.name}
                                </span>
                                <span className="ml-auto text-xs text-muted-foreground capitalize">
                                    {organization.role}
                                </span>
                                {organization.id === current?.id && (
                                    <Check className="size-4" />
                                )}
                            </DropdownMenuItem>
                        ))}

                        <DropdownMenuSeparator />

                        <DropdownMenuItem asChild>
                            <Link
                                href={organizationsIndex()}
                                className="gap-2"
                                prefetch
                            >
                                <Users className="size-4" />
                                Manage organizations
                            </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                            <Link href={organizationsIndex()} className="gap-2">
                                <Plus className="size-4" />
                                New organization
                            </Link>
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </SidebarMenuItem>
        </SidebarMenu>
    );
}
