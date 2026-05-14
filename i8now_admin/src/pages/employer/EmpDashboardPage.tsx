import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { apiGet } from '@/lib/api'
import { fmtMoney, fmtDate, cn } from '@/lib/utils'
import {
  Users, ClipboardList, CalendarCheck,
  CalendarDays, Briefcase, ArrowRight, TrendingUp,
  CheckCircle2, Clock, AlertCircle, Wallet,
} from 'lucide-react'

interface WalletData { balance: number; total_spent: number }
interface Stats {
  workers: number
  tasks_open: number
  interviews_upcoming: number
  shifts_open: number
  wallet: WalletData | null
}

function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-lg bg-zinc-100', className)} />
}

function StatusRow({ icon: Icon, iconClass, label, value }: {
  icon: React.ElementType; iconClass: string; label: string; value: string
}) {
  return (
    <div className="flex items-center gap-3">
      <Icon className={cn('h-4 w-4 shrink-0', iconClass)} />
      <span className="flex-1 text-xs text-zinc-500">{label}</span>
      <span className="text-xs font-semibold text-zinc-900">{value}</span>
    </div>
  )
}

export function EmpDashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const [workersRes, tasksRes, interviewsRes, shiftsRes, walletRes] = await Promise.allSettled([
          apiGet<{ data: { workers: unknown[] } }>('/employer/workers'),
          apiGet<{ data: unknown[]; meta: { total: number } }>('/employer/tasks?status=open&limit=1'),
          apiGet<{ data: { interviews: { status: string }[] } }>('/employer/interviews'),
          apiGet<{ data: unknown[]; meta: { total: number } }>('/employer/shifts?status=open&limit=1'),
          apiGet<{ data: { wallet: WalletData } }>('/employer/wallet'),
        ])
        setStats({
          workers: workersRes.status === 'fulfilled' ? (workersRes.value.data?.workers?.length ?? 0) : 0,
          tasks_open: tasksRes.status === 'fulfilled' ? (tasksRes.value.meta?.total ?? 0) : 0,
          interviews_upcoming: interviewsRes.status === 'fulfilled'
            ? (interviewsRes.value.data?.interviews?.filter((i) => i.status === 'scheduled').length ?? 0) : 0,
          shifts_open: shiftsRes.status === 'fulfilled' ? (shiftsRes.value.meta?.total ?? 0) : 0,
          wallet: walletRes.status === 'fulfilled' ? (walletRes.value.data?.wallet ?? null) : null,
        })
      } catch { /* non-fatal */ }
      finally { setLoading(false) }
    }
    void load()
  }, [])

  const kpis = [
    { label: 'Active Workers',       icon: Briefcase,     value: stats?.workers ?? 0,               format: 'number', sub: 'on your team',             href: '/emp/workers'    },
    { label: 'Open Tasks',           icon: ClipboardList, value: stats?.tasks_open ?? 0,            format: 'number', sub: 'pending completion',        href: '/emp/tasks'      },
    { label: 'Upcoming Interviews',  icon: CalendarCheck, value: stats?.interviews_upcoming ?? 0,   format: 'number', sub: 'scheduled',                 href: '/emp/interviews' },
    { label: 'Open Shifts',          icon: CalendarDays,  value: stats?.shifts_open ?? 0,           format: 'number', sub: 'accepting applications',    href: '/emp/shifts'     },
    { label: 'Wallet Balance',       icon: Wallet,        value: stats?.wallet?.balance ?? 0,       format: 'money',  sub: 'available to spend',        href: '/emp/wallet'     },
    { label: 'Total Spent',          icon: TrendingUp,    value: stats?.wallet?.total_spent ?? 0,   format: 'money',  sub: 'payments processed',        href: '/emp/wallet'     },
  ]

  const quickActions = [
    { label: 'Post a new shift',     href: '/emp/shifts',      icon: CalendarDays,  sub: 'Find workers for a role'    },
    { label: 'Browse candidates',    href: '/emp/candidates',  icon: Users,         sub: 'Discover available talent'  },
    { label: 'Schedule an interview',href: '/emp/interviews',  icon: CalendarCheck, sub: 'Arrange a candidate meeting' },
    { label: 'Assign a task',        href: '/emp/tasks',       icon: ClipboardList, sub: 'Delegate work to workers'   },
    { label: 'Process a payment',    href: '/emp/wallet',      icon: Wallet,        sub: 'Pay your workers securely'  },
  ]

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-lg font-semibold text-zinc-900">Dashboard</h1>
        <p className="text-sm text-zinc-500">Your workforce overview at a glance.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        {loading
          ? Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-28" />)
          : kpis.map((k) => (
            <Link key={k.label} to={k.href}
              className="group rounded-xl border border-zinc-200 bg-white p-5 transition-all hover:border-zinc-300 hover:shadow-sm">
              <div className="mb-3 flex items-start justify-between">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-100 transition-colors group-hover:bg-zinc-900">
                  <k.icon className="h-4 w-4 text-zinc-500 transition-colors group-hover:text-white" />
                </div>
                <span className="text-[10px] font-medium text-zinc-400 uppercase tracking-wide">{k.label}</span>
              </div>
              <p className="text-2xl font-bold text-zinc-900">
                {k.format === 'money' ? fmtMoney(k.value as number) : String(k.value)}
              </p>
              <p className="mt-0.5 text-xs text-zinc-400">{k.sub}</p>
            </Link>
          ))
        }
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="rounded-xl border border-zinc-200 bg-white">
          <div className="border-b border-zinc-100 px-5 py-4">
            <h2 className="text-sm font-semibold text-zinc-900">Quick Actions</h2>
            <p className="text-xs text-zinc-400">Common tasks to manage your workforce</p>
          </div>
          <div className="p-3 space-y-1.5">
            {quickActions.map((a) => (
              <Link key={a.href} to={a.href}
                className="group flex items-center gap-4 rounded-lg border border-transparent px-4 py-3 transition-all hover:border-zinc-200 hover:bg-zinc-50">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-zinc-100 transition-colors group-hover:bg-zinc-900">
                  <a.icon className="h-4 w-4 text-zinc-500 transition-colors group-hover:text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-zinc-800">{a.label}</p>
                  <p className="text-xs text-zinc-400">{a.sub}</p>
                </div>
                <ArrowRight className="h-4 w-4 text-zinc-300 transition-colors group-hover:text-zinc-600" />
              </Link>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-xl border border-zinc-200 bg-white p-5">
            <h3 className="mb-4 text-sm font-semibold text-zinc-900">Workforce Status</h3>
            <div className="space-y-3">
              <StatusRow icon={CheckCircle2} iconClass="text-emerald-500" label="Workers on team"      value={loading ? '—' : String(stats?.workers ?? 0)} />
              <StatusRow icon={Clock}        iconClass="text-amber-500"   label="Pending interviews"   value={loading ? '—' : String(stats?.interviews_upcoming ?? 0)} />
              <StatusRow icon={AlertCircle}  iconClass="text-zinc-400"   label="Open tasks"            value={loading ? '—' : String(stats?.tasks_open ?? 0)} />
            </div>
          </div>
          <div className="rounded-xl border border-zinc-200 bg-white p-5">
            <h3 className="mb-3 text-sm font-semibold text-zinc-900">Finance Summary</h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-zinc-500">Available balance</span>
                <span className="text-sm font-semibold text-zinc-900">{loading ? '—' : fmtMoney(stats?.wallet?.balance ?? 0)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-zinc-500">Total spent</span>
                <span className="text-sm font-medium text-zinc-700">{loading ? '—' : fmtMoney(stats?.wallet?.total_spent ?? 0)}</span>
              </div>
              <div className="mt-3 pt-3 border-t border-zinc-100">
                <Link to="/emp/wallet" className="text-xs font-medium text-zinc-900 hover:underline flex items-center gap-1">
                  View wallet <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
