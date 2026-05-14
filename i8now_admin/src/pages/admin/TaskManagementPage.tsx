import { useState } from 'react'
import { cn } from '@/lib/utils'
import { fmtDate } from '@/lib/fmt'
import {
  ClipboardList, Search, Filter, AlertCircle, AlertTriangle, Zap, Minus,
  CheckCircle2, Clock, Building2, User,
} from 'lucide-react'

interface AdminTask {
  id: string; title: string; worker: string; employer: string
  priority: 'low' | 'medium' | 'high' | 'urgent'
  status: 'pending' | 'in_progress' | 'review' | 'completed' | 'cancelled'
  due_date: string; created_at: string
}

const MOCK: AdminTask[] = Array.from({ length: 16 }, (_, i) => ({
  id: `tsk_${i}`,
  title: ['Complete KYC verification', 'Platform onboarding task', 'Safety compliance review', 'Payroll setup', 'Document submission', 'Training module'][i % 6],
  worker: ['Priya Sharma', 'Rohan Mehta', 'Anjali Gupta', 'Arjun Kumar', 'Neha Patel'][i % 5],
  employer: ['Acme Corp', 'Nexus Retail', 'Event Masters', 'TechSupport Co'][i % 4],
  priority: (['low', 'medium', 'high', 'urgent'] as const)[i % 4],
  status: (['pending', 'in_progress', 'review', 'completed', 'cancelled'] as const)[i % 5],
  due_date: new Date(Date.now() + (i - 5) * 86400000).toISOString(),
  created_at: new Date(Date.now() - i * 86400000).toISOString(),
}))

const PRIORITY_ICON = { low: Minus, medium: AlertCircle, high: AlertTriangle, urgent: Zap }
const PRIORITY_COLOR = {
  low: 'text-zinc-400',
  medium: 'text-blue-500',
  high: 'text-amber-500',
  urgent: 'text-red-500',
}
const STATUS_COLOR: Record<string, string> = {
  pending: 'bg-zinc-100 text-zinc-600 border-zinc-200',
  in_progress: 'bg-blue-50 text-blue-700 border-blue-200',
  review: 'bg-amber-50 text-amber-700 border-amber-200',
  completed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  cancelled: 'bg-zinc-50 text-zinc-400 border-zinc-200',
}

function SortHead({ label, col, sort, onSort }: { label: string; col: string; sort: { col: string; dir: 'asc' | 'desc' | null }; onSort: (c: string) => void }) {
  return (
    <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400">
      <button onClick={() => onSort(col)} className="flex items-center gap-1 hover:text-zinc-700">
        {label}
        <span className="text-zinc-300">
          {sort.col === col ? (sort.dir === 'asc' ? '↑' : '↓') : '⇅'}
        </span>
      </button>
    </th>
  )
}

export function TaskManagementPage() {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [priorityFilter, setPriorityFilter] = useState('all')
  const [sort, setSort] = useState<{ col: string; dir: 'asc' | 'desc' | null }>({ col: '', dir: null })

  function toggleSort(col: string) {
    setSort((s) => ({ col, dir: s.col === col ? (s.dir === 'asc' ? 'desc' : s.dir === 'desc' ? null : 'asc') : 'asc' }))
  }

  const tasks = MOCK.filter((t) => {
    const q = search.toLowerCase()
    const matchSearch = !search || t.title.toLowerCase().includes(q) || t.worker.toLowerCase().includes(q) || t.employer.toLowerCase().includes(q)
    const matchStatus = statusFilter === 'all' || t.status === statusFilter
    const matchPriority = priorityFilter === 'all' || t.priority === priorityFilter
    return matchSearch && matchStatus && matchPriority
  })

  const counts = {
    total: MOCK.length,
    pending: MOCK.filter(t => t.status === 'pending').length,
    in_progress: MOCK.filter(t => t.status === 'in_progress').length,
    completed: MOCK.filter(t => t.status === 'completed').length,
    overdue: MOCK.filter(t => new Date(t.due_date) < new Date() && t.status !== 'completed').length,
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-xl font-semibold">Task Management</h1>
        <p className="text-sm text-muted-foreground">Monitor all platform tasks across employers and workers</p>
      </div>

      {/* KPI Row */}
      <div className="mb-6 grid grid-cols-5 gap-4">
        {[
          { label: 'Total Tasks', value: counts.total, color: 'text-zinc-900' },
          { label: 'Pending', value: counts.pending, color: 'text-zinc-600' },
          { label: 'In Progress', value: counts.in_progress, color: 'text-blue-600' },
          { label: 'Completed', value: counts.completed, color: 'text-emerald-600' },
          { label: 'Overdue', value: counts.overdue, color: 'text-red-600' },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border bg-card p-4 shadow-sm">
            <p className="text-xs text-muted-foreground mb-1">{s.label}</p>
            <p className={cn('text-2xl font-bold', s.color)}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="mb-5 flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search tasks, workers, employers..." className="w-full rounded-lg border bg-background py-2.5 pl-9 pr-4 text-sm outline-none focus:border-foreground" />
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="rounded-lg border bg-background px-3 py-2.5 text-sm outline-none focus:border-foreground">
          <option value="all">All Status</option>
          <option value="pending">Pending</option>
          <option value="in_progress">In Progress</option>
          <option value="review">Review</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)} className="rounded-lg border bg-background px-3 py-2.5 text-sm outline-none focus:border-foreground">
          <option value="all">All Priority</option>
          <option value="urgent">Urgent</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
      </div>

      {/* Table */}
      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b">
            <tr>
              <SortHead label="Task" col="title" sort={sort} onSort={toggleSort} />
              <SortHead label="Worker" col="worker" sort={sort} onSort={toggleSort} />
              <SortHead label="Employer" col="employer" sort={sort} onSort={toggleSort} />
              <SortHead label="Priority" col="priority" sort={sort} onSort={toggleSort} />
              <SortHead label="Due Date" col="due_date" sort={sort} onSort={toggleSort} />
              <SortHead label="Status" col="status" sort={sort} onSort={toggleSort} />
            </tr>
          </thead>
          <tbody className="divide-y">
            {tasks.map((t) => {
              const PIcon = PRIORITY_ICON[t.priority]
              const isOverdue = new Date(t.due_date) < new Date() && t.status !== 'completed'
              return (
                <tr key={t.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <ClipboardList className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className="font-medium truncate max-w-48">{t.title}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <User className="h-3.5 w-3.5" />{t.worker}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <Building2 className="h-3.5 w-3.5" />{t.employer}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className={cn('flex items-center gap-1.5 font-medium capitalize', PRIORITY_COLOR[t.priority])}>
                      <PIcon className="h-3.5 w-3.5" />{t.priority}
                    </div>
                  </td>
                  <td className={cn('px-4 py-3 text-sm', isOverdue ? 'text-red-600 font-medium' : 'text-muted-foreground')}>
                    {fmtDate(t.due_date)}{isOverdue && ' ⚠'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn('rounded-md border px-2.5 py-0.5 text-xs font-medium capitalize', STATUS_COLOR[t.status])}>
                      {t.status.replace('_', ' ')}
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        <div className="border-t px-4 py-3 text-xs text-muted-foreground">
          Showing {tasks.length} of {MOCK.length} tasks
        </div>
      </div>
    </div>
  )
}
