import { useEffect, useState } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { clearTokens } from '@/lib/auth-storage'
import { apiGet } from '@/lib/api'
import {
  LayoutDashboard, Users, BookmarkCheck, MessageSquare, CalendarCheck,
  Briefcase, ClipboardList, CalendarDays, Wallet, Settings, LogOut,
  Building2, Bell,
} from 'lucide-react'

interface Profile { company_name?: string; industry?: string }

const NAV_SECTIONS = [
  {
    label: 'Overview',
    items: [{ to: '/emp', label: 'Dashboard', icon: LayoutDashboard, end: true }],
  },
  {
    label: 'Workforce',
    items: [
      { to: '/emp/candidates', label: 'Candidates',  icon: Users         },
      { to: '/emp/shortlists', label: 'Shortlists',  icon: BookmarkCheck },
      { to: '/emp/workers',    label: 'My Workers',  icon: Briefcase     },
      { to: '/emp/interviews', label: 'Interviews',  icon: CalendarCheck },
    ],
  },
  {
    label: 'Operations',
    items: [
      { to: '/emp/shifts',   label: 'Shifts',   icon: CalendarDays  },
      { to: '/emp/tasks',    label: 'Tasks',    icon: ClipboardList },
      { to: '/emp/messages', label: 'Messages', icon: MessageSquare },
    ],
  },
  {
    label: 'Finance',
    items: [{ to: '/emp/wallet', label: 'Wallet', icon: Wallet }],
  },
  {
    label: 'Account',
    items: [{ to: '/emp/settings', label: 'Settings', icon: Settings }],
  },
]

export function EmployerLayout() {
  const navigate = useNavigate()
  const [profile, setProfile] = useState<Profile | null>(null)

  useEffect(() => {
    apiGet<{ data: { profile: Profile } }>('/employer/me')
      .then((r) => setProfile(r.data?.profile ?? null))
      .catch(() => null)
  }, [])

  function handleLogout() {
    clearTokens()
    navigate('/login')
  }

  return (
    <div className="flex h-screen bg-zinc-50">
      {/* Sidebar */}
      <aside className="flex w-56 shrink-0 flex-col border-r border-zinc-200 bg-white">
        <div className="flex h-14 items-center gap-2.5 border-b border-zinc-100 px-4">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-zinc-900">
            <Building2 className="h-3.5 w-3.5 text-white" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-xs font-semibold text-zinc-900">
              {profile?.company_name ?? 'Employer Portal'}
            </p>
            <p className="text-[10px] text-zinc-400">{profile?.industry ?? 'Business'}</p>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-2.5 py-3 space-y-4">
          {NAV_SECTIONS.map((section) => (
            <div key={section.label}>
              <p className="mb-1 px-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
                {section.label}
              </p>
              <div className="space-y-0.5">
                {section.items.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={'end' in item ? item.end : undefined}
                    className={({ isActive }) =>
                      cn(
                        'flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs font-medium transition-colors',
                        isActive
                          ? 'bg-zinc-900 text-white'
                          : 'text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900',
                      )
                    }
                  >
                    <item.icon className="h-3.5 w-3.5 shrink-0" />
                    {item.label}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>

        <div className="border-t border-zinc-100 p-2.5">
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-medium text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900"
          >
            <LogOut className="h-3.5 w-3.5" />
            Sign out
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-zinc-200 bg-white px-6">
          <div />
          <div className="flex items-center gap-2">
            <button className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 hover:bg-zinc-100 hover:text-zinc-900 transition">
              <Bell className="h-4 w-4" />
            </button>
            <div className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-xs font-medium text-zinc-700">
              <div className="flex h-5 w-5 items-center justify-center rounded-full bg-zinc-900 text-[9px] font-bold text-white">
                {(profile?.company_name?.[0] ?? 'E').toUpperCase()}
              </div>
              <span className="max-w-[120px] truncate">{profile?.company_name ?? 'My Company'}</span>
            </div>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
