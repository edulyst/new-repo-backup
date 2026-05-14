import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { cn, fmtDate } from '@/lib/utils'
import { ClipboardList, Plus, Search, Trash2, CheckCircle2, Clock, Circle } from 'lucide-react'
import { toast } from 'sonner'

interface Task {
  _id: string
  title: string
  description?: string
  status: 'open' | 'in_progress' | 'done' | 'cancelled'
  priority?: 'low' | 'medium' | 'high'
  worker_id?: string
  due_date?: string
  created_at?: string
}

const STATUS_CONFIG: Record<string, { label: string; icon: React.ElementType; cls: string }> = {
  open:        { label: 'Open',        icon: Circle,       cls: 'bg-zinc-100 text-zinc-600 border-zinc-200' },
  in_progress: { label: 'In Progress', icon: Clock,        cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  done:        { label: 'Done',        icon: CheckCircle2, cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  cancelled:   { label: 'Cancelled',   icon: Circle,       cls: 'bg-red-50 text-red-600 border-red-200' },
}

const PRIORITY_CLS: Record<string, string> = {
  high:   'bg-red-50 text-red-600 border-red-200',
  medium: 'bg-amber-50 text-amber-600 border-amber-200',
  low:    'bg-zinc-100 text-zinc-500 border-zinc-200',
}

function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-lg bg-zinc-100', className)} />
}

const EMPTY_FORM = { title: '', description: '', priority: 'medium' as Task['priority'], worker_id: '', due_date: '' }

export function TasksPage() {
  const [tasks, setTasks]           = useState<Task[]>([])
  const [loading, setLoading]       = useState(true)
  const [search, setSearch]         = useState('')
  const [statusFilter, setFilter]   = useState('all')
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm]             = useState(EMPTY_FORM)
  const [saving, setSaving]         = useState(false)

  function loadTasks() {
    setLoading(true)
    api.get<{ data: Task[] }>('/employer/tasks?limit=50')
      .then((r) => setTasks(r.data ?? []))
      .catch(() => setTasks([]))
      .finally(() => setLoading(false))
  }

  useEffect(() => { loadTasks() }, [])

  async function handleCreate() {
    if (!form.title.trim()) { toast.error('Title is required'); return }
    setSaving(true)
    try {
      await api.post('/employer/tasks', { ...form, due_date: form.due_date || undefined, worker_id: form.worker_id || undefined })
      toast.success('Task created!')
      setShowCreate(false); setForm(EMPTY_FORM); loadTasks()
    } catch (e: any) { toast.error(e.message ?? 'Failed') }
    finally { setSaving(false) }
  }

  async function handleStatusChange(id: string, status: string) {
    try {
      await api.patch(`/employer/tasks/${id}`, { status })
      setTasks((prev) => prev.map((t) => t._id === id ? { ...t, status: status as Task['status'] } : t))
      toast.success('Task updated')
    } catch (e: any) { toast.error(e.message ?? 'Failed') }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this task?')) return
    try {
      await api.delete(`/employer/tasks/${id}`)
      setTasks((prev) => prev.filter((t) => t._id !== id))
      toast.success('Task deleted')
    } catch (e: any) { toast.error(e.message ?? 'Failed') }
  }

  const FILTERS = ['all', 'open', 'in_progress', 'done', 'cancelled']

  const filtered = tasks.filter((t) => {
    const matchSearch = !search || t.title.toLowerCase().includes(search.toLowerCase())
    const matchStatus = statusFilter === 'all' || t.status === statusFilter
    return matchSearch && matchStatus
  })

  const counts = { open: 0, in_progress: 0, done: 0, cancelled: 0 }
  tasks.forEach((t) => { if (t.status in counts) counts[t.status as keyof typeof counts]++ })

  return (
    <div className="space-y-5 p-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-zinc-900">Tasks</h1>
          <p className="text-sm text-zinc-500">Assign and track work for your team.</p>
        </div>
        <button onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-zinc-700">
          <Plus className="h-4 w-4" /> New Task
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-4 gap-3">
        {(Object.entries(counts) as [keyof typeof counts, number][]).map(([k, v]) => {
          const cfg = STATUS_CONFIG[k]
          return (
            <div key={k} onClick={() => setFilter(k)}
              className={cn('cursor-pointer rounded-xl border p-4 transition hover:shadow-sm', statusFilter === k ? 'border-zinc-300 bg-white shadow-sm' : 'border-zinc-200 bg-white')}>
              <p className="text-xl font-bold text-zinc-900">{v}</p>
              <p className="mt-0.5 text-xs text-zinc-400 capitalize">{k.replace('_', ' ')}</p>
            </div>
          )
        })}
      </div>

      {/* Filters row */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search tasks…"
            className="w-full rounded-lg border border-zinc-200 bg-white py-2.5 pl-9 pr-4 text-sm outline-none focus:border-zinc-400" />
        </div>
        <div className="flex gap-1 rounded-lg border border-zinc-200 bg-white p-1">
          {FILTERS.map((f) => (
            <button key={f} type="button" onClick={() => setFilter(f)}
              className={cn('rounded-md px-3 py-1.5 text-xs font-medium capitalize transition-colors',
                statusFilter === f ? 'bg-zinc-900 text-white' : 'text-zinc-500 hover:text-zinc-900')}>
              {f.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Task list */}
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-200 bg-white py-16 text-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-zinc-100">
            <ClipboardList className="h-5 w-5 text-zinc-400" />
          </div>
          <p className="text-sm font-medium text-zinc-700">No tasks found</p>
          <p className="mt-1 text-xs text-zinc-400">Create a task to assign work to your team.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
          <table className="w-full text-sm">
            <thead className="border-b border-zinc-100 bg-zinc-50/60">
              <tr>
                {['Task', 'Priority', 'Due date', 'Status', 'Actions'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-zinc-400">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-50">
              {filtered.map((t) => {
                const cfg = STATUS_CONFIG[t.status] ?? STATUS_CONFIG.open
                const StatusIcon = cfg.icon
                return (
                  <tr key={t._id} className="hover:bg-zinc-50/60 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-medium text-zinc-900">{t.title}</p>
                      {t.description && <p className="mt-0.5 text-xs text-zinc-400 line-clamp-1">{t.description}</p>}
                    </td>
                    <td className="px-4 py-3">
                      {t.priority && (
                        <span className={cn('rounded-full border px-2.5 py-0.5 text-[10px] font-medium capitalize', PRIORITY_CLS[t.priority])}>
                          {t.priority}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-zinc-500">{fmtDate(t.due_date)}</td>
                    <td className="px-4 py-3">
                      <select
                        value={t.status}
                        onChange={(e) => handleStatusChange(t._id, e.target.value)}
                        className={cn('rounded-full border px-2.5 py-1 text-[10px] font-medium capitalize outline-none cursor-pointer', cfg.cls)}
                      >
                        {Object.keys(STATUS_CONFIG).map((s) => (
                          <option key={s} value={s}>{s.replace('_', ' ')}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => handleDelete(t._id)}
                        className="rounded-lg p-1.5 text-zinc-400 transition hover:bg-red-50 hover:text-red-600">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Create modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setShowCreate(false)}>
          <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="mb-4 text-sm font-semibold text-zinc-900">New Task</h3>
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-zinc-700">Title *</label>
                <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="e.g. Prepare weekly report" className={inputCls} />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-zinc-700">Description</label>
                <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={3} placeholder="Additional details…" className={`${inputCls} resize-none`} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-zinc-700">Priority</label>
                  <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value as Task['priority'] })} className={inputCls}>
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-zinc-700">Due date</label>
                  <input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} className={inputCls} />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-zinc-700">Worker ID (optional)</label>
                <input value={form.worker_id} onChange={(e) => setForm({ ...form, worker_id: e.target.value })}
                  placeholder="Assign to a worker" className={inputCls} />
              </div>
              <div className="flex gap-2 pt-2">
                <button onClick={() => setShowCreate(false)} className={cancelBtn}>Cancel</button>
                <button onClick={handleCreate} disabled={saving} className={primaryBtn}>
                  {saving ? 'Creating…' : 'Create Task'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const inputCls = 'w-full rounded-lg border border-zinc-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-zinc-400'
const primaryBtn = 'flex-1 rounded-lg bg-zinc-900 py-2.5 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50'
const cancelBtn = 'flex-1 rounded-lg border border-zinc-200 py-2.5 text-sm font-medium text-zinc-600 hover:bg-zinc-50'
