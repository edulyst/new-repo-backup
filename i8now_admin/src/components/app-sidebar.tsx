import * as React from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { NavUser } from '@/components/nav-user'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from '@/components/ui/sidebar'
import {
  BriefcaseBusinessIcon,
  Building2Icon,
  CalendarClockIcon,
  ClipboardListIcon,
  LayoutDashboardIcon,
  Settings2Icon,
  UsersIcon,
  UserRoundIcon,
} from 'lucide-react'
import { useMe } from '@/hooks/use-me'
import { useAdminSettings } from '@/hooks/use-admin-settings'
import type { NavItemId } from '@/lib/admin-settings'

type NavItemMeta = {
  id: NavItemId
  label: string
  icon: React.ElementType
  path: string
  matchPrefix?: string
}

const ALL_NAV_ITEMS: NavItemMeta[] = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboardIcon, path: '/', matchPrefix: undefined },
  { id: 'users', label: 'Users', icon: UsersIcon, path: '/users', matchPrefix: '/users' },
  { id: 'workers', label: 'Workers', icon: UserRoundIcon, path: '/workers', matchPrefix: '/workers' },
  { id: 'employers', label: 'Employers', icon: Building2Icon, path: '/employers', matchPrefix: '/employers' },
  { id: 'shifts', label: 'Shifts', icon: BriefcaseBusinessIcon, path: '/shifts', matchPrefix: '/shifts' },
  { id: 'timesheets', label: 'Timesheets', icon: CalendarClockIcon, path: '/timesheets', matchPrefix: '/timesheets' },
  { id: 'applications', label: 'Applications', icon: ClipboardListIcon, path: '/applications', matchPrefix: '/applications' },
]

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { pathname } = useLocation()
  const { user } = useMe()
  const { settings } = useAdminSettings()

  const navUser = {
    name: user?.email ? user.email.split('@')[0] : 'Admin',
    email: user?.email ?? '',
    avatar: '',
  }

  // Build ordered, filtered nav items
  const navItems = React.useMemo(() => {
    const configMap = new Map(settings.nav_items.map((n) => [n.id, n]))
    return settings.nav_items
      .filter((cfg) => cfg.visible)
      .map((cfg) => {
        const meta = ALL_NAV_ITEMS.find((m) => m.id === cfg.id)
        return meta ?? null
      })
      .filter((m): m is NavItemMeta => m !== null)
  }, [settings.nav_items])

  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader className="gap-0 border-b border-sidebar-border/80 pb-3 pt-3">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" className="data-[slot=sidebar-menu-button]:p-2!" asChild>
              <NavLink to="/">
                <div className="flex size-8 items-center justify-center overflow-hidden rounded-lg bg-foreground text-background shadow-sm shrink-0">
                  {settings.logo_data_url ? (
                    <img
                      src={settings.logo_data_url}
                      alt="Logo"
                      className="h-full w-full object-contain p-0.5"
                    />
                  ) : (
                    <span className="text-xs font-bold">i8</span>
                  )}
                </div>
                <div className="grid flex-1 text-left leading-tight">
                  <span className="truncate text-sm font-semibold">{settings.site_name || 'i8now Admin'}</span>
                  <span className="truncate text-xs text-muted-foreground">{settings.site_subtitle || 'Operations'}</span>
                </div>
              </NavLink>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent className="gap-0">
        <SidebarGroup>
          <SidebarGroupLabel>Directory</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => {
                const isActive =
                  item.matchPrefix
                    ? pathname.startsWith(item.matchPrefix)
                    : pathname === item.path
                const Icon = item.icon
                return (
                  <SidebarMenuItem key={item.id}>
                    <SidebarMenuButton asChild isActive={isActive} tooltip={item.label}>
                      <NavLink to={item.path}>
                        <Icon />
                        <span>{item.label}</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator className="my-2" />

        <SidebarGroup>
          <SidebarGroupLabel>Notifications Management</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={pathname.startsWith('/admin/notifications')}
                  tooltip="Notifications Management"
                >
                  <NavLink to="/admin/notifications">
                    <ClipboardListIcon />
                    <span>Notifications Management</span>
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator className="my-2" />

        {/* Platform Admin section removed — kept for future use */}

        <SidebarGroup className="mt-auto">
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={pathname === '/settings'}
                  tooltip="Settings"
                >
                  <NavLink to="/settings">
                    <Settings2Icon />
                    <span>Settings</span>
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border/80">
        <NavUser user={navUser} />
      </SidebarFooter>
    </Sidebar>
  )
}
