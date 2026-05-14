import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { cn, fmtDate, fmtMoney } from '@/lib/utils'
import { CalendarDays, Plus, Search, ChevronRight, Users, Clock, MapPin } from 'lucide-react'
import { toast } from 'sonner'

interface Shift {
  _id: string
  title: string
  location?: string
  date?: string
  start_time?: string
  end_time?: string
  pay_rate?: number
  slots?: number
  filled_slots?: number
  status: 'open' | 'filled' | 'in_progress' | 'completed' | 'cancelled'
  description?: string
}

interface Application {
  _id: string
  worker_profile_id: string
  status: string
  applied_at?: string
}

const STATUS_STYLE: Record<string, string> = {
  open:        'bg-emerald-50 text-emerald-700 border-emerald-200',
  filled:      'bg-blue-50 text-blue-700 border-blue-200',
  in_progress: 'bg-amber-50 text-amber-700 border-amber-200',
  completed:   'bg-zinc-100 text-zinc-600 border-zinc-200',
  cancelled:   'bg-red-50 text-red-600 border-red-200',
}

function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-lg bg-zinc-100', className)} />
}

const EMPTY_FORM = { title: '', location: '', date: '', start_time: '', end_time: '', pay_rate: '', slots: '1', description: '' }

export function ShiftsPage() {
  const [shifts, setShifts]         = useState<Shift[]>([])
  const [loading, setLoading]       = useState(true)
  const [search, setSearch]         = useState('')
  const [statusFilter, setFilter]   = useState('all')
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm]             = useState(EMPTY_FORM)
  const [saving, setSaving]         = useState(false)
  const [selected, setSelected]     = useState<Shift | null>(null)
  const [apps, setApps]             = useState<Application[]>([])
  const [appsLoading, setAppsLoading] = useState(false)

  function loadShifts() {
    setLoading(true)
    api.get<{ data: Shift[]; meta: { total: number } }>('/employer/shifts?limit=50')
      .then((r) => setShifts(r.data ?? []))
      .catch(() => setShifts([]))
      .finally(() => setLoading(false))
  }

  useEffect(() => { loadShifts() }, [])

  async function handleCreate() {
    if (!form.title || !form.date) { toast.error('Title and date are required'); return }
    setSaving(true)
    try {
      await api.post('/employer/shifts', {
        ...form,
        pay_rate: Number(form.pay_rate) || 0,
        slots: Number(form.slots) || 1,
      })
      toast.success('Shift created!')
      setShowCreate(false); setForm(EMPTY_FORM); loadShifts()
    } catch (e: any) { toast.error(e.message ?? 'Failed to create shift') }
    finally { setSaving(false) }
  }

  async function loadApplications(shift: Shift) {
    setSelected(shift); setAppsLoading(true)
    try {
      const r = await api.get<{ data: { applications: Application[] } }>(`/employer/shifts/${shift._id}/applications`)
      setApps(r.data?.applications ?? [])
    } catch { setApps([]) }
    finally { setAppsLoading(false) }
  }

  async function handleReview(shiftId: string, appId: string, status: string) {
    try {
      await api.patch(`/employer/shifts/${shiftId}/applications/${appId}`, { status })
      toast.success(`Application ${status}`)
      setApps((prev) => prev.map((a) => a._id === appId ? { ...a, status } : a))
      loadShifts()
    } catch (e: any) { toast.error(e.message ?? 'Failed') }
  }

  const FILTERS = ['all', 'open', 'filled', 'in_progress', 'completed', 'cancelled']

  const filtered = shifts.filter((s) => {
    const matchSearch = !search || s.title.toLowerCase().includes(search.toLowerCase()) || s.location?.toLowerCase().includes(search.toLowerCase())
    const matchStatus = statusFilter === 'all' || s.status === statusFilter
    return matchSearch && matchStatus
  })

  return (
    <div className="space-y-5 p-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-zinc-900">Shifts</h1>
          <p className="text-sm text-zinc-500">Post and manage your work shifts.</p>
        </div>
        <button onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-zinc-700">
          <Plus className="h-4 w-4" /> Post Shift
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search shifts…"
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

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-zinc-100 bg-zinc-50/60">
            <tr>
              {['Shift', 'Location', 'Date', 'Pay Rate', 'Slots', 'Status', ''].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-medium text-zinc-400">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-50">
            {loading
              ? Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}><td colSpan={7} className="px-4 py-3"><Skeleton className="h-4" /></td></tr>
                ))
              : filtered.map((s) => (
                <tr key={s._id} className="transition-colors hover:bg-zinc-50/60">
                  <td className="px-4 py-3 font-medium text-zinc-900">{s.title}</td>
                  <td className="px-4 py-3 text-zinc-500">
                    <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{s.location ?? '—'}</span>
                  </td>
                  <td className="px-4 py-3 text-zinc-500">
                    <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{fmtDate(s.date)}</span>
                  </td>
                  <td className="px-4 py-3 text-zinc-700 font-medium">{s.pay_rate ? fmtMoney(s.pay_rate) : '—'}</td>
                  <td className="px-4 py-3 text-zinc-500">
                    <span className="flex items-center gap-1"><Users className="h-3 w-3" />{s.filled_slots ?? 0}/{s.slots ?? 1}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn('rounded-full border px-2.5 py-1 text-[10px] font-medium capitalize', STATUS_STYLE[s.status] ?? STATUS_STYLE.open)}>
                      {s.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => loadApplications(s)}
                      className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-50">
                      Applications <ChevronRight className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              ))
            }
            {!loading && filtered.length === 0 && (
              <tr><td colSpan={7} className="py-12 text-center text-sm text-zinc-400">No shifts found</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Create modal */}
      {showCreate && (
        <Modal title="Post a New Shift" onClose={() => setShowCreate(false)}>
          <div className="space-y-3">
            <FormField label="Job title *">
              <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="e.g. Warehouse Supervisor" className={inputCls} />
            </FormField>
            <FormField label="Location">
              <input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })}
                placeholder="e.g. Mumbai, Maharashtra" className={inputCls} />
            </FormField>
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Date *">
                <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className={inputCls} />
              </FormField>
              <FormField label="Slots">
                <input type="number" min="1" value={form.slots} onChange={(e) => setForm({ ...form, slots: e.target.value })} className={inputCls} />
              </FormField>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Start time">
                <input type="time" value={form.start_time} onChange={(e) => setForm({ ...form, start_time: e.target.value })} className={inputCls} />
              </FormField>
              <FormField label="Pay rate (₹)">
                <input type="number" value={form.pay_rate} onChange={(e) => setForm({ ...form, pay_rate: e.target.value })}
                  placeholder="0" className={inputCls} />
              </FormField>
            </div>
            <FormField label="Description">
              <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={3} placeholder="Describe the role and requirements…" className={`${inputCls} resize-none`} />
            </FormField>
            <div className="flex gap-2 pt-2">
              <button onClick={() => setShowCreate(false)} className={cancelBtn}>Cancel</button>
              <button onClick={handleCreate} disabled={saving} className={primaryBtn}>
                {saving ? 'Creating…' : 'Post Shift'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Applications panel */}
      {selected && (
        <Modal title={`Applications — ${selected.title}`} onClose={() => setSelected(null)}>
          {appsLoading ? (
            <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
          ) : apps.length === 0 ? (
            <p className="py-8 text-center text-sm text-zinc-400">No applications yet.</p>
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {apps.map((app) => (
                <div key={app._id} className="flex items-center justify-between rounded-lg border border-zinc-100 bg-zinc-50 px-4 py-3">
                  <div>
                    <p className="text-xs font-medium text-zinc-800">Worker #{app.worker_profile_id.slice(-6)}</p>
                    <p className="text-[10px] text-zinc-400">{fmtDate(app.applied_at)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={cn('rounded-full border px-2 py-0.5 text-[10px] font-medium capitalize',
                      app.status === 'confirmed' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                      app.status === 'rejected' ? 'bg-red-50 text-red-600 border-red-200' : 'bg-zinc-100 text-zinc-500 border-zinc-200')}>
                      {app.status}
                    </span>
                    {app.status === 'applied' && (
                      <>
                        <button onClick={() => handleReview(selected._id, app._id, 'confirmed')}
                          className="rounded-md bg-emerald-600 px-2.5 py-1 text-[10px] font-medium text-white hover:bg-emerald-700">
                          Confirm
                        </button>
                        <button onClick={() => handleReview(selected._id, app._id, 'rejected')}
                          className="rounded-md border border-zinc-200 px-2.5 py-1 text-[10px] font-medium text-zinc-600 hover:bg-zinc-100">
                          Reject
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="mt-4 flex justify-end">
            <button onClick={() => setSelected(null)} className={cancelBtn}>Close</button>
          </div>
        </Modal>
      )}
    </div>
  )
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-medium text-zinc-700">{label}</label>
      {children}
    </div>
  )
}

function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-lg rounded-2xl border border-zinc-200 bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h3 className="mb-4 text-sm font-semibold text-zinc-900">{title}</h3>
        {children}
      </div>
    </div>
  )
}

const inputCls = 'w-full rounded-lg border border-zinc-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-zinc-400'
const primaryBtn = 'flex-1 rounded-lg bg-zinc-900 py-2.5 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50'
const cancelBtn = 'flex-1 rounded-lg border border-zinc-200 py-2.5 text-sm font-medium text-zinc-600 hover:bg-zinc-50'
